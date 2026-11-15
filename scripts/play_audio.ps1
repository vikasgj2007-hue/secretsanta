Add-Type -AssemblyName PresentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([System.Uri](Resolve-Path 'public/audio/christmas-train-music.mp3').Path)
$player.Volume = 1.0

# Wait for media to open
for ($i = 0; $i -lt 50; $i++) {
    [System.Threading.Thread]::Sleep(100)
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    if ($player.NaturalDuration.HasTimeSpan) {
        Write-Host "Duration: $($player.NaturalDuration.TimeSpan.TotalSeconds)s"
        break
    }
}

$player.Play()
Write-Host "Playing from 0s..."
for ($i = 0; $i -lt 30; $i++) {
    [System.Threading.Thread]::Sleep(200)
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([Action]{}, [System.Windows.Threading.DispatcherPriority]::Background)
    Write-Host "Pos: $($player.Position.TotalSeconds)s"
}
$player.Stop()

