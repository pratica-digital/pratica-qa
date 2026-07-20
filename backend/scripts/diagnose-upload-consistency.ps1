param(
  [string]$DatabaseUser = 'qa_user',
  [string]$DatabaseName = 'qa_platform'
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backendRoot = (Resolve-Path (Join-Path $projectRoot 'backend')).Path
$uploadsRoot = Join-Path $backendRoot 'uploads'
$references = [System.Collections.Generic.HashSet[string]]::new(
  [System.StringComparer]::OrdinalIgnoreCase
)
$missing = [System.Collections.Generic.List[object]]::new()

function Read-DatabaseRows([string]$tableName) {
  $query = "SELECT row_to_json(t) FROM $tableName t;"
  docker compose --project-directory $projectRoot exec -T db `
    psql -U $DatabaseUser -d $DatabaseName -At -c $query |
    Where-Object { $_.Trim() } |
    ForEach-Object { $_ | ConvertFrom-Json }
}

function Add-Reference([string]$kind, [string]$id, [string]$url) {
  if (-not $url) {
    return
  }

  [void]$references.Add($url)
  $relativePath = $url.TrimStart('/') -replace '/', '\'
  $filePath = Join-Path $backendRoot $relativePath

  if (-not (Test-Path -LiteralPath $filePath)) {
    $missing.Add([pscustomobject]@{ Kind = $kind; Id = $id; Url = $url })
  }
}

foreach ($project in Read-DatabaseRows 'projects') {
  Add-Reference 'PROJECT_IMAGE' $project.id $project.imageUrl
}

foreach ($attachment in Read-DatabaseRows 'test_result_attachments') {
  Add-Reference 'TEST_RESULT_ATTACHMENT' $attachment.id $attachment.url
}

$files = if (Test-Path -LiteralPath $uploadsRoot) {
  @(Get-ChildItem -LiteralPath $uploadsRoot -Recurse -File)
} else {
  @()
}
$unreferenced = @($files | Where-Object {
  $relative = $_.FullName.Substring($backendRoot.Length).Replace('\', '/')
  -not $references.Contains($relative)
})

Write-Output "Referenced URLs: $($references.Count)"
Write-Output "Files on disk: $($files.Count)"
Write-Output "Missing referenced files: $($missing.Count)"
$missing | Format-Table -AutoSize
Write-Output "Unreferenced files (dry-run only): $($unreferenced.Count)"
$unreferenced | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize

Write-Output 'No files or database records were changed.'
