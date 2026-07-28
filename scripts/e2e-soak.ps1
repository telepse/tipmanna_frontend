# Approximate 49-test E2E explore request pattern — 30 minute soak (no Playwright assertions)
param(
  [int]$DurationMinutes = 30,
  [string]$BaseUrl = "http://localhost:3000",
  [string]$BackendUrl = "http://localhost:8000"
)

$paths = @(
  "/explore?e2e=1",
  "/explore?e2e=1&feedTab=saves",
  "/explore?e2e=1&feedTab=tv&e2eTv=1",
  "/explore?e2e=1&feedTab=community",
  "/explore?e2e=1&tab=my-communities",
  "/explore?e2e=1&tab=discover",
  "/explore?e2e=1&feedTypes=COMEDY&feedTab=saves",
  "/explore?e2e=1&feedTab=community&communities=22222222-2222-4222-8222-222222222222",
  "/explore?e2e=1&tab=join&joinCommunity=11111111-1111-4111-8111-111111111111&feedTab=tv&e2eTv=1"
)

$end = (Get-Date).AddMinutes($DurationMinutes)
$stats = @{ ok = 0; err429 = 0; err500 = 0; other = 0; health = 0 }
$i = 0

Write-Host "Soak start: $(Get-Date -Format o) duration=${DurationMinutes}m"

while ((Get-Date) -lt $end) {
  $i++
  foreach ($p in $paths) {
    try {
      $r = Invoke-WebRequest -Uri "$BaseUrl$p" -UseBasicParsing -TimeoutSec 120
      if ($r.StatusCode -eq 200) { $stats.ok++ } else { $stats.other++ }
    } catch {
      $msg = $_.Exception.Message
      if ($msg -match '429') { $stats.err429++ } elseif ($msg -match '500') { $stats.err500++ } else { $stats.other++ }
    }
  }
  try {
    $h = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing -TimeoutSec 10
    if ($h.StatusCode -eq 200) { $stats.health++ }
  } catch { $stats.other++ }
  if ($i % 10 -eq 0) {
    Write-Host "$(Get-Date -Format HH:mm:ss) cycle=$i stats=$($stats | ConvertTo-Json -Compress)"
  }
  Start-Sleep -Milliseconds 800
}

Write-Host "Soak end: $(Get-Date -Format o)"
Write-Host "FINAL_STATS=$($stats | ConvertTo-Json -Compress)"
