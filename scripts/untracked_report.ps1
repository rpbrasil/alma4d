$files = git ls-files --others --exclude-standard
$dirs = @{ }
foreach ($f in $files) {
    $d = [System.IO.Path]::GetDirectoryName($f)
    if ([string]::IsNullOrEmpty($d)) { $d = '.' }
    if ($dirs.ContainsKey($d)) { $dirs[$d] = $dirs[$d] + 1 } else { $dirs[$d] = 1 }
}

$dirs.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30 | ForEach-Object { "{0,6} {1}" -f $_.Value, $_.Name }
