# Guía para Probar el Sistema QR

## 1. Iniciar el Servidor

```bash
# En modo desarrollo (con hot-reload)
npm run start:dev

# O en modo producción
npm start
```

El servidor se ejecutará en: **http://localhost:9100** (o el puerto configurado en `.env`)

**Nota:** Las rutas tienen prefijo `/api/v1`, entonces los endpoints son:
- `http://localhost:9100/api/v1/qr/...`

---

## 2. Obtener un SessionId

Primero necesitas obtener el ID de una sesión para generar su QR:

### Opción A: Desde el navegador
```
http://localhost:9100/api/v1/classes/sessions?pageSize=10
```

### Opción B: Con curl
```bash
curl http://localhost:9100/api/v1/classes/sessions?pageSize=10
```

### Opción C: Con PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:9100/api/v1/classes/sessions?pageSize=10" -Method Get
```

**Busca una sesión con estado `SCHEDULED` o `IN_PROGRESS` y copia su `id`.**

---

## 3. Generar el QR

### Opción A: JSON con Data URL (para mostrar en pantalla)

**Navegador:**
```
http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI
```

**curl:**
```bash
curl http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI" -Method Get
```

**Respuesta:**
```json
{
  "sessionId": "abc-123...",
  "qrImage": "data:image/png;base64,iVBORw0KGgo...",
  "qrData": "abc-123...",
  "sessionInfo": {
    "classTitle": "Yoga Matutino",
    "startAt": "2024-01-15T10:00:00Z",
    "branch": "Sede Centro"
  },
  "downloadUrl": "/qr/session/abc-123...?format=image"
}
```

### Opción B: Imagen PNG directa (para descargar/imprimir)

**Navegador:**
```
http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI?format=image
```
(Abre esta URL y descarga la imagen)

**curl:**
```bash
curl http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI?format=image --output qr-code.png
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:9100/api/v1/qr/session/TU-SESSION-ID-AQUI?format=image" -OutFile "qr-code.png"
```

---

## 4. Validar QR Escaneado

Simula que un usuario escaneó el QR:

**curl:**
```bash
curl -X POST http://localhost:9100/api/v1/qr/scan \
  -H "Content-Type: application/json" \
  -d "{\"qrData\": \"TU-SESSION-ID-AQUI\"}"
```

**PowerShell:**
```powershell
$body = @{ qrData = "TU-SESSION-ID-AQUI" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9100/api/v1/qr/scan" -Method Post -Body $body -ContentType "application/json"
```

**Respuesta:**
```json
{
  "sessionId": "abc-123...",
  "class": {
    "id": "...",
    "title": "Yoga Matutino",
    "description": "...",
    "discipline": "Yoga",
    "instructorName": "Juan Pérez"
  },
  "schedule": {
    "startAt": "2024-01-15T10:00:00Z",
    "endAt": "2024-01-15T11:00:00Z",
    "durationMin": 60
  },
  "branch": {
    "id": "...",
    "name": "Sede Centro",
    "location": "Av. Principal 123"
  },
  "status": "SCHEDULED"
}
```

---

## 5. Confirmar Check-in (requiere autenticación)

Primero necesitas un token JWT. Luego:

**curl:**
```bash
curl -X POST http://localhost:9100/api/v1/checkin/qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU-JWT-TOKEN-AQUI" \
  -d "{\"sessionId\": \"TU-SESSION-ID-AQUI\"}"
```

**PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer TU-JWT-TOKEN-AQUI"
    "Content-Type" = "application/json"
}
$body = @{ sessionId = "TU-SESSION-ID-AQUI" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9100/api/v1/checkin/qr" -Method Post -Headers $headers -Body $body
```

---

## 6. Probar con Postman o Insomnia

### Endpoints disponibles:

1. **GET** `/api/v1/qr/session/:sessionId`
   - Genera QR (JSON)

2. **GET** `/api/v1/qr/session/:sessionId?format=image`
   - Descarga QR (PNG)

3. **POST** `/api/v1/qr/scan`
   - Body: `{ "qrData": "sessionId" }`
   - Valida QR escaneado

4. **POST** `/api/v1/qr/generate`
   - Body: `{ "payload": "cualquier-texto" }`
   - Genera QR genérico

5. **POST** `/api/v1/checkin/qr`
   - Headers: `Authorization: Bearer <token>`
   - Body: `{ "sessionId": "..." }`
   - Confirma check-in

---

## Ejemplo Completo de Flujo

```bash
# 1. Obtener sesiones
curl http://localhost:9100/api/v1/classes/sessions?pageSize=1

# 2. Copiar el sessionId de la respuesta (ej: "abc-123-def-456")

# 3. Generar QR (descargar imagen)
curl http://localhost:9100/api/v1/qr/session/abc-123-def-456?format=image --output qr.png

# 4. Validar QR (simular escaneo)
curl -X POST http://localhost:9100/api/v1/qr/scan \
  -H "Content-Type: application/json" \
  -d "{\"qrData\": \"abc-123-def-456\"}"

# 5. (Opcional) Hacer check-in si tienes token JWT
curl -X POST http://localhost:9100/api/v1/checkin/qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU-TOKEN" \
  -d "{\"sessionId\": \"abc-123-def-456\"}"
```

---

## Notas

- **Puerto por defecto:** 9100 (configurable con variable `PORT` en `.env`)
- **Prefijo de rutas:** `/api/v1`
- **Autenticación:** Solo el endpoint `/checkin/qr` requiere JWT
- **Formato de QR:** El QR contiene el `sessionId` como texto plano

