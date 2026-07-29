# PCS-CTS Validator Pack
# One-command independent validation
#
# This script runs all CTS scenarios against the reference kernel,
# generates evidence bundles, and verifies them cryptographically.

Write-Host "=== PCS-CTS Validator Pack ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will run all conformance scenarios and verify evidence bundles."
Write-Host "Expected runtime: ~30 seconds"
Write-Host ""

# Check Node.js version
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion"
    Write-Host ""
} catch {
    Write-Host "Error: Node.js is required but not installed." -ForegroundColor Red
    Write-Host "Please install Node.js v18+ from https://nodejs.org"
    exit 1
}

# Determine script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CtsDir = Join-Path $ScriptDir "persistra-cts"
$KernelDir = Join-Path $ScriptDir "persistra-kernel"

# Verify directories exist
if (-not (Test-Path $CtsDir)) {
    Write-Host "Error: CTS directory not found: $CtsDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $KernelDir)) {
    Write-Host "Error: Kernel directory not found: $KernelDir" -ForegroundColor Red
    exit 1
}

# List of scenarios to run
$Scenarios = @(
    "L1.persistence.decision-state-recovery",
    "L1.persistence.session-boundary-integrity",
    "L2.governance.policy-enforcement",
    "L2.governance.policy-determinism-repeatability",
    "L2.governance.policy-continuity-across-boundary",
    "L2.governance.namespace-isolation",
    "L3.continuity.model-transition-decision-recovery",
    "L3.continuity.multi-hop-transition",
    "L3.continuity.policy-survives-transition",
    "L3.continuity.conflict-resolution-stable"
)

Write-Host "Running $($Scenarios.Count) scenarios..."
Write-Host ""

# Run each scenario
$Passed = 0
$Failed = 0
$Bundles = @()

foreach ($Scenario in $Scenarios) {
    Write-Host "Running: $Scenario"
    
    $RunnerPath = Join-Path $CtsDir "runners\run-cts.js"
    $Process = Start-Process -FilePath "node" `
        -ArgumentList "`"$RunnerPath`" --target `"$KernelDir`" --scenario `"$Scenario`" --clean" `
        -NoNewWindow -Wait -PassThru
    
    if ($Process.ExitCode -eq 0) {
        Write-Host "  ✅ PASS" -ForegroundColor Green
        $Passed++
        
        # Find the most recent evidence bundle
        $OutputDir = Join-Path $CtsDir "output"
        $LatestBundle = Get-ChildItem $OutputDir | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($LatestBundle) {
            $Bundles += $LatestBundle.FullName
        }
    } else {
        Write-Host "  ❌ FAIL" -ForegroundColor Red
        $Failed++
    }
}

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "Passed: $Passed / $($Scenarios.Count)"
Write-Host "Failed: $Failed / $($Scenarios.Count)"
Write-Host ""

if ($Failed -gt 0) {
    Write-Host "❌ Some scenarios failed. Check output above for details." -ForegroundColor Red
    exit 1
}

Write-Host "=== Verifying Evidence Bundles ===" -ForegroundColor Cyan
Write-Host ""

# Verify each evidence bundle
$Verified = 0
$VerificationFailed = 0

foreach ($Bundle in $Bundles) {
    $BundleName = Split-Path $Bundle -Leaf
    Write-Host "Verifying: $BundleName"
    
    $VerifierPath = Join-Path $CtsDir "runners\verify-evidence.js"
    $Process = Start-Process -FilePath "node" `
        -ArgumentList "`"$VerifierPath`" `"$Bundle`"" `
        -NoNewWindow -Wait -PassThru
    
    if ($Process.ExitCode -eq 0) {
        Write-Host "  ✅ VERIFIED" -ForegroundColor Green
        $Verified++
    } else {
        Write-Host "  ❌ VERIFICATION FAILED" -ForegroundColor Red
        $VerificationFailed++
    }
}

Write-Host ""
Write-Host "=== Verification Results ===" -ForegroundColor Cyan
Write-Host "Verified: $Verified / $($Bundles.Count)"
Write-Host "Failed: $VerificationFailed / $($Bundles.Count)"
Write-Host ""

if ($VerificationFailed -gt 0) {
    Write-Host "❌ Some evidence bundles failed verification." -ForegroundColor Red
    exit 1
}

Write-Host "=== Evidence Bundles ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "All evidence bundles are located in:"
Write-Host "$CtsDir\output\"
Write-Host ""
Write-Host "You can inspect individual bundles:"
Write-Host "  - conformance.json (test results)"
Write-Host "  - trace.json (execution trace)"
Write-Host "  - attestation.txt (cryptographic attestation)"
Write-Host ""

Write-Host "✅ SUCCESS: All scenarios passed and all evidence verified!" -ForegroundColor Green
Write-Host ""
Write-Host "This proves:"
Write-Host "  - The reference kernel conforms to PCS L1/L2/L3 requirements"
Write-Host "  - Evidence bundles are cryptographically verifiable"
Write-Host "  - Independent validators can reproduce these results"
Write-Host ""
