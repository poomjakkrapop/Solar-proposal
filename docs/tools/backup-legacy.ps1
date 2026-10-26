#requires -Version 7.0
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_-]{1,80}$')][string]$ServiceName,
  [Parameter(Mandatory)][string]$DestinationDirectory,
  [switch]$Execute
)
$ErrorActionPreference = 'Stop'
$targetDirectory = [IO.Path]::GetFullPath($DestinationDirectory)
if ($targetDirectory.StartsWith('\\')) { throw 'Choose a private local directory, not a network share.' }
$ancestor = $targetDirectory
while ($ancestor) {
  if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Backup destination ancestors must not be junctions or symbolic links.' }
  if (Test-Path -LiteralPath (Join-Path $ancestor '.git')) { throw 'Backups must be outside every Git checkout.' }
  $parent = [IO.Directory]::GetParent($ancestor)
  $ancestor = if ($parent) { $parent.FullName } else { $null }
}
if (-not $Execute) {
  [pscustomobject]@{
    Mode = 'Plan only: no files created and no database connection'
    Service = $ServiceName
    Destination = $targetDirectory
    SourcePolicy = 'Verified TLS; read-only; require exactly the eight Solar model tables'
    Next = 'Install PostgreSQL client tools and configure a private libpq service/passfile before using -Execute'
  }
  return
}
if (-not $IsWindows) { throw 'This script uses Windows ACLs. Use the documented native pg_dump procedure on other systems.' }
$dumpTool = (Get-Command pg_dump -CommandType Application -ErrorAction Stop).Source
$queryTool = (Get-Command psql -CommandType Application -ErrorAction Stop).Source
$restoreTool = (Get-Command pg_restore -CommandType Application -ErrorAction Stop).Source
$runDirectory = Join-Path $targetDirectory ('solar-legacy-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $runDirectory -ErrorAction Stop | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($identity)
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @($identity, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
  $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $runDirectory -AclObject $acl
function Invoke-PrivatePg([string]$Executable, [string[]]$PgArguments, [string]$Label) {
  $info = [Diagnostics.ProcessStartInfo]::new($Executable)
  $info.UseShellExecute = $false
  $info.CreateNoWindow = $true
  $info.WindowStyle = 'Hidden'
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  $info.Environment['PGOPTIONS'] = '-c default_transaction_read_only=on -c lock_timeout=5000'
  $info.Environment['PGCONNECT_TIMEOUT'] = '15'
  foreach ($argument in $PgArguments) { $info.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::Start($info)
  try {
    $outputTask = $process.StandardOutput.ReadToEndAsync()
    $errorTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $outputText = $outputTask.GetAwaiter().GetResult()
    $errorText = $errorTask.GetAwaiter().GetResult()
    [IO.File]::WriteAllText((Join-Path $runDirectory ($Label + '.private.log')), $errorText)
    if ($process.ExitCode -ne 0) { throw "PostgreSQL operation failed; private log: $runDirectory" }
    return $outputText
  } finally { $process.Dispose() }
}
$connection = "service=$ServiceName sslmode=verify-full"
$preflight = @'
begin read only;
select count(*) filter (where n.nspname='public' and c.relname in ('User','Customer','Package','Equipment','CompanyInfo','Proposal','Template','FileBlob')),
       count(*) filter (where not (n.nspname='public' and c.relname in ('User','Customer','Package','Equipment','CompanyInfo','Proposal','Template','FileBlob','_prisma_migrations')))
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%';
rollback;
'@
$counts = (Invoke-PrivatePg $queryTool @('--no-psqlrc','--no-password','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=1',"--dbname=$connection","--command=$preflight") 'preflight').Trim()
if ($counts -ne '8|0') { throw 'Database layout is not an isolated Solar database. Stop and review its schema before exporting.' }
$archive = Join-Path $runDirectory 'solar-legacy.dump'
Invoke-PrivatePg $dumpTool @('--no-password','--format=custom','--lock-wait-timeout=5s',"--file=$archive","--dbname=$connection") 'dump' | Out-Null
$listing = Invoke-PrivatePg $restoreTool @('--list',$archive) 'archive-list'
[IO.File]::WriteAllText((Join-Path $runDirectory 'archive-toc.private.txt'), $listing)
foreach ($table in @('User','Customer','Package','Equipment','CompanyInfo','Proposal','Template','FileBlob')) {
  if ($listing -notmatch ('TABLE DATA public ' + [regex]::Escape($table) + '\s')) { throw 'Archive is missing expected table data entries; do not use it for migration.' }
}
$manifest = [ordered]@{
  Format = 'PostgreSQL custom archive'; CreatedUtc = [DateTime]::UtcNow.ToString('o')
  Sha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
  Bytes = (Get-Item -LiteralPath $archive).Length
  ModelTableEntries = 8; RestoreVerified = $false
  Note = 'Contains private data and password hashes. Keep local/private; never commit, upload to chat, or restore over an existing database.'
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDirectory 'manifest.private.json') -Encoding utf8
[pscustomobject]@{ Status='Archive created and readable; restore rehearsal still required'; Directory=$runDirectory; Sha256=$manifest.Sha256 }
