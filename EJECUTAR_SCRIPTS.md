# Guía para Ejecutar Scripts de Carga de Datos

## Prerequisitos

1. **Docker corriendo** (base de datos PostgreSQL):
   ```bash
   docker-compose up -d
   ```

2. **Backend corriendo**:
   ```bash
   npm run start:dev
   ```

3. **Python instalado** (verificar):
   ```bash
   python --version
   ```

4. **Instalar dependencias de Python**:
   ```bash
   pip install requests
   ```

---

## Orden de Ejecución

Los scripts deben ejecutarse en este orden:

1. **crearClases.py** - Crea las clases
2. **crearSesiones.py** - Crea las sesiones (necesita clases)
3. **crearReservas.py** - Crea las reservas (necesita sesiones)

---

## Ejecutar los Scripts

### 1. Crear Clases

```bash
cd test
python crearClases.py
```

O desde la raíz del proyecto:
```bash
python test/crearClases.py
```

**Qué hace:** Lee `test/classes.jsonl` y crea todas las clases en la base de datos.

---

### 2. Crear Sesiones

```bash
cd test
python crearSesiones.py
```

O desde la raíz:
```bash
python test/crearSesiones.py
```

**Qué hace:** 
- Obtiene todas las clases creadas
- Lee `test/sessions_to_schedule.jsonl`
- Crea sesiones para cada clase

---

### 3. Crear Reservas

```bash
cd test
python crearReservas.py
```

O desde la raíz:
```bash
python test/crearReservas.py
```

**Qué hace:**
- Obtiene todas las sesiones
- Selecciona aleatoriamente el 50% de las sesiones
- Crea reservas para esas sesiones

---

## Ejecutar Todo de Una Vez

### En Windows (PowerShell):

```powershell
# Desde la raíz del proyecto
python test/crearClases.py
python test/crearSesiones.py
python test/crearReservas.py
```

### En Linux/Mac:

```bash
# Desde la raíz del proyecto
python3 test/crearClases.py && \
python3 test/crearSesiones.py && \
python3 test/crearReservas.py
```

---

## Verificar que Funcionó

### Ver clases creadas:
```bash
curl http://localhost:9100/api/v1/classes
```

### Ver sesiones creadas:
```bash
curl http://localhost:9100/api/v1/classes/sessions?pageSize=10
```

### Ver reservas creadas:
```bash
curl http://localhost:9100/api/v1/reservations
```

---

## Notas

- **Puerto:** Los scripts están configurados para usar `http://localhost:9100`
- **Autenticación:** Si los endpoints requieren autenticación, descomenta la línea `Authorization` en cada script y agrega tu token JWT
- **Archivos de datos:** Los scripts leen de:
  - `test/classes.jsonl` - Datos de clases
  - `test/sessions_to_schedule.jsonl` - Datos de sesiones
- **Errores:** Si algún script falla, revisa:
  - Que el servidor esté corriendo
  - Que la base de datos esté accesible
  - Que los archivos `.jsonl` existan

---

## Solución de Problemas

### Error: "Cannot connect to server"
- Verifica que el backend esté corriendo: `npm run start:dev`
- Verifica el puerto: debe ser 9100

### Error: "ModuleNotFoundError: No module named 'requests'"
```bash
pip install requests
```

### Error: "No class IDs retrieved"
- Ejecuta primero `crearClases.py`

### Error: "No sessions found"
- Ejecuta primero `crearSesiones.py`

