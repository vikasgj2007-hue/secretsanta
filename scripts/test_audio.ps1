$path = (Resolve-Path 'public/audio/christmas-train-music.mp3').Path
Write-Host "Path: $path"
$wmp = New-Object -ComObject WMPlayer.OCX
$wmp.settings.volume = 100
$wmp.URL = $path
Start-Sleep -Seconds 2
Write-Host "Status: $($wmp.status)"
Write-Host "CurrentPosition: $($wmp.controls.currentPosition)"
Write-Host "Duration: $($wmp.currentMedia.duration)"
$wmp.controls.stop()

