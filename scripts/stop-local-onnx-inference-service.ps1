Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$trainingRoot = Split-Path -Parent $root
$serviceDirectory = Join-Path $trainingRoot 'node_onnx_validation'
$pidPath = Join-Path $serviceDirectory 'local-onnx-inference.pid'

if (-not (Test-Path -LiteralPath $pidPath)) {
    Write-Output 'local_inference_status=not_running'
    exit 0
}

$processId = (Get-Content -LiteralPath $pidPath -Raw).Trim()
if ($processId -notmatch '^\d+$') {
    Remove-Item -LiteralPath $pidPath -Force
    throw 'Invalid local service PID file was removed.'
}

$process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
if ($null -ne $process) {
    Stop-Process -Id $process.Id -Force
    Write-Output "stopped_local_inference_pid=$($process.Id)"
} else {
    Write-Output 'local_inference_status=stale_pid_removed'
}
Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
