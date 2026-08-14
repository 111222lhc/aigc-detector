Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$trainingRoot = Split-Path -Parent $root
$serviceDirectory = Join-Path $trainingRoot 'node_onnx_validation'
$serverScript = Join-Path $serviceDirectory 'local-onnx-inference-server.mjs'
$configPath = Join-Path $serviceDirectory 'local_service.env'
$exportDirectory = Join-Path $trainingRoot 'exports\aigc_detector_zhv2_finetune_v1_onnx_v1'
$stdout = Join-Path $serviceDirectory 'local-onnx-inference.stdout.log'
$stderr = Join-Path $serviceDirectory 'local-onnx-inference.stderr.log'
$pidPath = Join-Path $serviceDirectory 'local-onnx-inference.pid'

if (-not (Test-Path -LiteralPath $serverScript)) { throw 'Local service script is missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $exportDirectory 'model_fp32.onnx'))) { throw 'Validated FP32 ONNX model is missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $serviceDirectory 'node_modules\onnxruntime-node'))) { throw 'Audited onnxruntime-node dependency is missing.' }
if (Test-Path -LiteralPath $pidPath) {
    $existingId = Get-Content -LiteralPath $pidPath | Select-Object -First 1
    if ($existingId -and (Get-Process -Id $existingId -ErrorAction SilentlyContinue)) { throw "Local inference service is already running. PID=$existingId" }
}

if (-not (Test-Path -LiteralPath $configPath) -or -not ((Get-Content -LiteralPath $configPath -Raw) -match '(?m)^AIGC_SERVICE_API_KEY=.{32,}$')) {
    $random = New-Object byte[] 32
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    try { $rng.GetBytes($random) } finally { $rng.Dispose() }
    $key = (($random | ForEach-Object { $_.ToString('x2') }) -join '')
    @(
        '# Generated for this machine only. Do not commit, upload, or share this file.',
        'HOST=127.0.0.1',
        'PORT=18765',
        "MODEL_EXPORT_DIR=$exportDirectory",
        'MAX_TEXT_CHARACTERS=50000',
        "AIGC_SERVICE_API_KEY=$key"
    ) | Set-Content -LiteralPath $configPath -Encoding utf8
    attrib +h $configPath
}

$node = (Get-Command node -ErrorAction Stop).Source
$proc = Start-Process -FilePath $node -ArgumentList @($serverScript, '--config', $configPath) -WorkingDirectory $serviceDirectory -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
$proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
$proc.Id | Set-Content -LiteralPath $pidPath -Encoding ascii
Write-Output "started_local_inference_pid=$($proc.Id)"
Write-Output "health=http://127.0.0.1:18765/health"
