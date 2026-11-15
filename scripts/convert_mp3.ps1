Add-Type -AssemblyName 'System.Runtime.WindowsRuntime'
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media, ContentType=WindowsRuntime] | Out-Null

function Await($asyncOp) {
    $task = [System.WindowsRuntimeSystemExtensions]::AsTask($asyncOp)
    $task.Wait()
    return $task.Result
}

$srcPath = (Resolve-Path 'public/audio/christmas-train-music.mp3').Path
$dstPath = (Join-Path (Get-Location) 'scripts/temp_audio.wav')
if (Test-Path $dstPath) { Remove-Item $dstPath }

$srcFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($srcPath))
$dstFolder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync((Get-Location).Path + "\scripts"))
$dstFile = Await ($dstFolder.CreateFileAsync('temp_audio.wav', [Windows.Storage.CreationCollisionOption]::ReplaceExisting))

$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateWav([Windows.Media.MediaProperties.AudioEncodingQuality]::Medium)
$transcoder = New-Object Windows.Media.Transcoding.MediaTranscoder

$prepareOp = Await ($transcoder.PrepareFileTranscodeAsync($srcFile, $dstFile, $profile))
if ($prepareOp.CanTranscode) {
    Write-Host "Transcoding..."
    $transcodeOp = Await ($prepareOp.TranscodeAsync())
    Write-Host "Transcode complete!"
} else {
    Write-Host "Cannot transcode: $($prepareOp.FailureReason)"
}

