# Servidor local simples (sem Python/Node)
$root = $PSScriptRoot
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Jogo em http://localhost:$port/  (Ctrl+C pra parar)"
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".gltf" = "model/gltf+json"
  ".glb"  = "model/gltf-binary"
  ".bin"  = "application/octet-stream"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".hdr"  = "application/octet-stream"
  ".json" = "application/json"
  ".txt"  = "text/plain; charset=utf-8"
  ".wasm" = "application/wasm"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
  $full = Join-Path $root $path
  if (Test-Path $full -PathType Leaf) {
    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $bytes = [IO.File]::ReadAllBytes($full)
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $msg = [Text.Encoding]::UTF8.GetBytes("404")
    $ctx.Response.StatusCode = 404
    $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $ctx.Response.Close()
}
