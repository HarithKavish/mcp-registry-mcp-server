<#
.SYNOPSIS
  Captures one still photo from the default webcam and writes it to -OutFile as JPEG.

.DESCRIPTION
  Uses the Windows.Media.Capture WinRT API (the same stack the built-in Camera app uses),
  so it works with any UVC webcam without extra drivers or installed binaries.

  WinRT projection via the "[Type, Namespace, ContentType=WindowsRuntime]" syntax only
  works under the .NET Framework CLR that ships with Windows PowerShell 5.1
  (powershell.exe) -- PowerShell 7+ (pwsh, .NET Core/.NET 5+) throws
  "Operation is not supported on this platform" for the same code. This script must be
  invoked with `powershell.exe`, not `pwsh`.

  The MediaCapture object is disposed as soon as the photo is written, which releases
  the camera device (and turns off the capture LED) immediately -- callers should not
  need to do anything further to "close" the camera.
#>
param(
    [Parameter(Mandatory = $true)][string]$OutFile,
    [int]$WarmupMs = 1200
)

$ErrorActionPreference = 'Stop'

function Write-Result($ok, $message, $path) {
    [Console]::Out.WriteLine((@{ ok = $ok; message = $message; path = $path } | ConvertTo-Json -Compress))
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    $asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
    })[0]

    function Wait-Action($WinRtAction) {
        $netTask = $asTaskAction.Invoke($null, @($WinRtAction))
        $netTask.Wait(-1) | Out-Null
    }

    function Wait-Operation($WinRtOperation, $ResultType) {
        $specificAsTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $specificAsTask.Invoke($null, @($WinRtOperation))
        $netTask.Wait(-1) | Out-Null
        return $netTask.Result
    }

    [Windows.Media.Capture.MediaCapture, Windows.Media.Capture, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Capture.MediaCaptureInitializationSettings, Windows.Media.Capture, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Capture.StreamingCaptureMode, Windows.Media.Capture, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.MediaProperties.ImageEncodingProperties, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
    [Windows.Storage.CreationCollisionOption, Windows.Storage, ContentType = WindowsRuntime] | Out-Null

    $mediaCapture = New-Object Windows.Media.Capture.MediaCapture
    $initSettings = New-Object Windows.Media.Capture.MediaCaptureInitializationSettings
    $initSettings.StreamingCaptureMode = [Windows.Media.Capture.StreamingCaptureMode]::Video

    try {
        Wait-Action ($mediaCapture.InitializeAsync($initSettings))
    }
    catch {
        Write-Result $false "no camera available, or access denied (check Windows Settings > Privacy > Camera): $($_.Exception.Message)" $null
        exit 1
    }

    # Let auto-exposure/auto-white-balance settle before capturing, otherwise the first
    # frame after opening the device is often dark or off-color.
    Start-Sleep -Milliseconds $WarmupMs

    $folderPath = Split-Path -Path $OutFile -Parent
    $fileName = Split-Path -Path $OutFile -Leaf
    if (-not (Test-Path $folderPath)) {
        New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
    }

    $imageProps = [Windows.Media.MediaProperties.ImageEncodingProperties]::CreateJpeg()
    $folder = Wait-Operation ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($folderPath)) ([Windows.Storage.StorageFolder])
    $file = Wait-Operation ($folder.CreateFileAsync($fileName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])

    Wait-Action ($mediaCapture.CapturePhotoToStorageFileAsync($imageProps, $file))

    Write-Result $true "captured" $OutFile
    exit 0
}
catch {
    Write-Result $false $_.Exception.Message $null
    exit 1
}
finally {
    if ($mediaCapture) {
        # Releases the device immediately -- this is the "close the camera" step.
        $mediaCapture.Dispose()
    }
}
