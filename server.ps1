$root = (Get-Location).Path
$dataFile = Join-Path $root "dashboard-data.json"
if (-not (Test-Path $dataFile)) {
  $initial = @{
    players = @(
      @{ id="player-1"; name="Iron Frontier Player"; bestScore=0; bestWave=1; games=0; zone="desert" }
    )
    runs = @()
    settings = @{ music=$true; sfx=$true; ads=$true }
  }
  $initial | ConvertTo-Json -Depth 8 | Set-Content $dataFile -Encoding UTF8
}

function Read-JsonFile { Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8 | ConvertFrom-Json }
function Write-JsonFile($value) { $value | ConvertTo-Json -Depth 12 | Set-Content $dataFile -Encoding UTF8 }
function Write-JsonResponse($context, $status, $value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($value | ConvertTo-Json -Depth 12))
  $context.Response.StatusCode = $status
  $context.Response.ContentType = "application/json; charset=utf-8"
  $context.Response.Headers["Access-Control-Allow-Origin"] = "*"
  $context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
  $context.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:4173/")
$listener.Start()
Write-Output "Iron Frontier server: http://127.0.0.1:4173"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $path = $request.Url.AbsolutePath
  if ($request.HttpMethod -eq "OPTIONS") {
    Write-JsonResponse $context 200 @{ ok=$true }
    continue
  }

  if ($path.StartsWith("/api/")) {
    $store = Read-JsonFile
    if ($path -eq "/api/player/dashboard") {
      $player = @($store.players)[0]
      $weapons = @("Knife","Bow","Fire arrows","Pistol","Rifle","Sniper","Rocket","Laser")
      Write-JsonResponse $context 200 @{
        overview = @{ name=$player.name; bestScore=$player.bestScore; bestWave=$player.bestWave; games=$player.games; zone=$player.zone; weapons=$weapons }
        players = @($store.players)
        runs = @($store.runs)
        settings = $store.settings
      }
    } elseif ($path -eq "/api/admin/dashboard") {
      $weapons = @("Knife","Bow","Fire arrows","Pistol","Rifle","Sniper","Rocket","Laser")
      $player = @($store.players)[0]
      Write-JsonResponse $context 200 @{
        overview = @{ name="Admin Dashboard"; bestScore=$player.bestScore; bestWave=$player.bestWave; games=$player.games; zone=$player.zone; weapons=$weapons }
        players = @($store.players)
        runs = @($store.runs)
        settings = $store.settings
      }
    } elseif ($path -eq "/api/runs" -and $request.HttpMethod -eq "POST") {
      $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
      $body = $reader.ReadToEnd() | ConvertFrom-Json
      $reader.Close()
      $run = @{
        id = [guid]::NewGuid().ToString()
        playerName = if ($body.playerName) { [string]$body.playerName } else { "Iron Frontier Player" }
        score = [int]($body.score)
        wave = [int]($body.wave)
        zone = if ($body.zone) { [string]$body.zone } else { "desert" }
        createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm")
      }
      $runs = @($store.runs) + $run
      if ($runs.Count -gt 500) { $runs = $runs | Select-Object -Last 500 }
      $store.runs = $runs
      $player = @($store.players)[0]
      $player.bestScore = [Math]::Max([int]$player.bestScore, [int]$run.score)
      $player.bestWave = [Math]::Max([int]$player.bestWave, [int]$run.wave)
      $player.games = [int]$player.games + 1
      $player.zone = $run.zone
      $store.players = @($player)
      Write-JsonFile $store
      Write-JsonResponse $context 200 @{ ok=$true; run=$run }
    } elseif ($path -eq "/api/admin/settings" -and $request.HttpMethod -eq "POST") {
      $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
      $body = $reader.ReadToEnd() | ConvertFrom-Json
      $reader.Close()
      $store.settings = @{ music=[bool]$body.music; sfx=[bool]$body.sfx; ads=[bool]$body.ads }
      Write-JsonFile $store
      Write-JsonResponse $context 200 @{ ok=$true }
    } else {
      Write-JsonResponse $context 404 @{ error="Not found" }
    }
    continue
  }

  $relative = $path.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($relative)) { $relative = "index.html" }
  $file = Join-Path $root $relative
  $full = [IO.Path]::GetFullPath($file)
  if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    $context.Response.StatusCode = 403
    $context.Response.Close()
    continue
  }
  if (Test-Path -LiteralPath $full -PathType Leaf) {
    $bytes = [IO.File]::ReadAllBytes($full)
    switch ([IO.Path]::GetExtension($full).ToLower()) {
      ".html" { $context.Response.ContentType = "text/html; charset=utf-8" }
      ".css" { $context.Response.ContentType = "text/css; charset=utf-8" }
      ".js" { $context.Response.ContentType = "application/javascript; charset=utf-8" }
      ".json" { $context.Response.ContentType = "application/json; charset=utf-8" }
    }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $context.Response.StatusCode = 404
  }
  $context.Response.Close()
}
