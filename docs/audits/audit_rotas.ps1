$OutFile = "audit_rotas_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$Cwd = (Get-Location).Path
$CwdPrefix = $Cwd + [System.IO.Path]::DirectorySeparatorChar
$ApiPrefix = $Cwd + [System.IO.Path]::DirectorySeparatorChar + "app" + [System.IO.Path]::DirectorySeparatorChar + "api" + [System.IO.Path]::DirectorySeparatorChar

function Trim-Cwd($path) {
  return $path -replace [regex]::Escape($CwdPrefix), ""
}

"AUDITORIA DE ROTAS QUEBRADAS - $(Get-Date)" | Out-File $OutFile -Encoding utf8
"="*70 | Out-File $OutFile -Append -Encoding utf8

function Audit-Section($title, $cmd) {
  "" | Out-File $OutFile -Append -Encoding utf8
  "=== $title ===" | Out-File $OutFile -Append -Encoding utf8
  & $cmd 2>&1 | Out-File $OutFile -Append -Encoding utf8
}

# === SUPER ADMIN ===
Audit-Section "1.1 Paginas existentes em /admin" {
  Get-ChildItem app/admin -Recurse -Filter "page.tsx" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

Audit-Section "1.2 Hrefs internos chamando /admin/*" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'href=["''](\/admin\/[^"'']+)' |
    ForEach-Object {
      $mm = [regex]::Matches($_.Line, 'href=["''](\/admin\/[^"'']+)')
      foreach ($m in $mm) {
        $p = Trim-Cwd $_.Path
        "{0}:{1} -> {2}" -f $p, $_.LineNumber, $m.Groups[1].Value
      }
    } | Sort-Object -Unique
}

Audit-Section "1.3 router.push/redirect pra /admin/*" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern '(router\.push|redirect|router\.replace)\(["''`].*\/admin\/' |
    ForEach-Object {
      $p = Trim-Cwd $_.Path
      "{0}:{1} -> {2}" -f $p, $_.LineNumber, $_.Line.Trim()
    } | Select-Object -First 20
}

Audit-Section "1.4 APIs /api/admin/* existentes" {
  Get-ChildItem app/api/admin -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

# === PARCEIROS ===
Audit-Section "2.1 Paginas existentes em /parceiro" {
  Get-ChildItem app/parceiro -Recurse -Filter "page.tsx" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

Audit-Section "2.2 APIs /api/parceiro/* existentes" {
  Get-ChildItem app/api/parceiro -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

Audit-Section "2.3 Hrefs chamando /parceiro/*" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'href=["'']\/parceiro\/[^"'']+' |
    ForEach-Object {
      $p = Trim-Cwd $_.Path
      "{0}:{1} -> {2}" -f $p, $_.LineNumber, $_.Line.Trim()
    } | Select-Object -First 15
}

Audit-Section "2.4 Tabelas partner_* no codigo" {
  Get-ChildItem app,components,lib -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern '\.from\(["''](partner_|partners)' |
    ForEach-Object {
      $p = Trim-Cwd $_.Path
      "{0}:{1} -> {2}" -f $p, $_.LineNumber, $_.Line.Trim()
    } | Select-Object -First 20
}

# === SUPORTE ===
Audit-Section "3.1 Paginas existentes em /suporte" {
  Get-ChildItem app/suporte -Recurse -Filter "page.tsx" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

Audit-Section "3.2 APIs /api/suporte/* existentes" {
  Get-ChildItem app/api/suporte -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue |
    ForEach-Object { Trim-Cwd $_.FullName }
}

Audit-Section "3.3 Hrefs chamando /suporte/*" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'href=["'']\/suporte\/[^"'']+' |
    ForEach-Object {
      $p = Trim-Cwd $_.Path
      "{0}:{1} -> {2}" -f $p, $_.LineNumber, $_.Line.Trim()
    } | Select-Object -First 15
}

# === FETCH/API CALLS ===
Audit-Section "4.1 Fetches pra /api/admin que podem estar quebrados" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'fetch\(["''`](\/api\/admin\/[^"''`]+)' |
    ForEach-Object {
      $mm = [regex]::Matches($_.Line, 'fetch\(["''`](\/api\/admin\/[^"''`]+)')
      foreach ($x in $mm) {
        $p = Trim-Cwd $_.Path
        "{0}:{1} -> {2}" -f $p, $_.LineNumber, $x.Groups[1].Value
      }
    } | Sort-Object -Unique
}

Audit-Section "4.2 Fetches pra /api/parceiro" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'fetch\(["''`](\/api\/parceiro\/[^"''`]+)' |
    ForEach-Object {
      $mm = [regex]::Matches($_.Line, 'fetch\(["''`](\/api\/parceiro\/[^"''`]+)')
      foreach ($x in $mm) {
        $p = Trim-Cwd $_.Path
        "{0}:{1} -> {2}" -f $p, $_.LineNumber, $x.Groups[1].Value
      }
    } | Sort-Object -Unique
}

Audit-Section "4.3 Fetches pra /api/suporte" {
  Get-ChildItem app,components -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
    Select-String -Pattern 'fetch\(["''`](\/api\/suporte\/[^"''`]+)' |
    ForEach-Object {
      $mm = [regex]::Matches($_.Line, 'fetch\(["''`](\/api\/suporte\/[^"''`]+)')
      foreach ($x in $mm) {
        $p = Trim-Cwd $_.Path
        "{0}:{1} -> {2}" -f $p, $_.LineNumber, $x.Groups[1].Value
      }
    } | Sort-Object -Unique
}

# === COMPONENTES ORFAOS ===
Audit-Section "5.1 Componentes admin que ninguem usa" {
  $components = Get-ChildItem app/admin,components -Recurse -Include *.tsx -ErrorAction SilentlyContinue
  foreach ($comp in $components) {
    $name = $comp.BaseName
    if ($name -eq "page" -or $name -eq "layout" -or $name -eq "loading" -or $name -eq "error") { continue }

    $imports = Get-ChildItem app,components,lib -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
      Select-String -Pattern "/$name" -SimpleMatch -List

    if ($imports.Count -eq 0) {
      $rel = Trim-Cwd $comp.FullName
      "ORFAO: $rel"
    }
  }
}

# === LINKS BROKEN PROVAVEIS ===
Audit-Section "6.1 Todos hrefs internos unicos (pra revisar)" {
  Get-ChildItem app,components -Recurse -Include *.tsx,*.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern 'href=["''](\/[a-z][^"'']+)' |
    ForEach-Object {
      $mm = [regex]::Matches($_.Line, 'href=["''](\/[a-z][^"'']+)')
      foreach ($x in $mm) { $x.Groups[1].Value }
    } | Sort-Object -Unique
}

Audit-Section "6.2 Rotas top-level que existem como pages" {
  Get-ChildItem app -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "page.tsx") } |
    ForEach-Object { "/$($_.Name)" } |
    Sort-Object
}

# === ENDPOINTS NAO USADOS ===
Audit-Section "7.1 APIs definidas mas que nenhum codigo chama" {
  $apis = Get-ChildItem app/api -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue
  foreach ($api in $apis) {
    $relativePath = $api.FullName -replace [regex]::Escape($ApiPrefix), ""
    $apiPath = "/api/" + ($relativePath -replace "\\route\.ts$", "" -replace "\\", "/")

    $usage = Get-ChildItem app,components,lib -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
      Select-String -Pattern $apiPath -SimpleMatch -List

    if ($usage.Count -eq 0) {
      "NAO USADA: $apiPath"
    }
  }
}

"" | Out-File $OutFile -Append -Encoding utf8
"="*70 | Out-File $OutFile -Append -Encoding utf8
"Auditoria de rotas salva em: $OutFile" | Out-File $OutFile -Append -Encoding utf8

Write-Host "`nAuditoria pronta em: $OutFile"
