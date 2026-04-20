$body = @{
    systemPrompt = "Return ONLY a JSON array of 3 items: [{`"name`":`"test`",`"activity`":`"test`",`"level`":1}]. No other text."
    messages = @(@{ role = "user"; text = "test" })
    options = @{ model = "qwen3.5-flash"; maxTokens = 500 }
} | ConvertTo-Json -Depth 4

try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/qwen-chat" -Method POST -ContentType "application/json" -Body $body
    $resp | ConvertTo-Json
} catch {
    Write-Host "Error: $_"
}
