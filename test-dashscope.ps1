$apiKey = $env:VITE_QWEN_API_KEY
if (-not $apiKey) {
    $envFile = ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^VITE_QWEN_API_KEY=(.+)$') {
                $apiKey = $matches[1].Trim()
            }
        }
    }
}

Write-Host "API Key: $($apiKey.Substring(0, [Math]::Min(15, $apiKey.Length)))..."

$body = @{
    model = "qwen3.5-flash"
    max_tokens = 500
    messages = @(
        @{ role = "system"; content = "Return ONLY: hello" }
        @{ role = "user"; content = "test" }
    )
} | ConvertTo-Json -Depth 4

try {
    $resp = Invoke-RestMethod -Uri "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $apiKey"
    } -Body $body
    $resp | ConvertTo-Json -Depth 4
} catch {
    Write-Host "Error: $_"
    Write-Host "Response: $($_.Exception.Response)"
}
