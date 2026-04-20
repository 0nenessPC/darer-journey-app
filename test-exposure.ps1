$body = @{
    systemPrompt = "You are a clinical psychologist. Based on the user profile, generate exactly 3 exposure activities. Return ONLY a JSON array: [{""name"":""Boss Name"",""activity"":""specific activity"",""level"":1}]. No other text."
    messages = @(@{ role = "user"; text = "User profile:
- Core strengths: Courage, Determination
- Values: Build meaningful social connections
- Social challenges: Fear of judgment in groups
- Shadow assessment: Avoidance of social situations, fear of criticism" })
    options = @{ model = "qwen3.5-flash"; maxTokens = 1000 }
} | ConvertTo-Json -Depth 4

Write-Host "Testing proxy with exposure prompt..."
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/api/qwen-chat" -Method POST -ContentType "application/json" -Body $body
    Write-Host "Reply: $($resp.reply)"
    if ([string]::IsNullOrEmpty($resp.reply)) {
        Write-Host "WARNING: Empty reply from proxy!"
    }
} catch {
    Write-Host "Error: $_"
}
