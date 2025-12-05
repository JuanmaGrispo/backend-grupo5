# Guía de Implementación: Sistema de Notificaciones (Frontend)

## 📋 Resumen

El backend implementa un sistema de notificaciones usando **long polling**. El frontend debe consultar periódicamente el endpoint de notificaciones para obtener las novedades. El backend acumula las notificaciones cuando ocurren eventos (cancelaciones, reprogramaciones) y procesa recordatorios cuando el frontend consulta.

---

## 🔌 Endpoints Disponibles

### Base URL
```
/api/v1/notifications
```

### 1. Obtener Notificaciones No Leídas
**GET** `/api/v1/notifications`

Obtiene todas las notificaciones no leídas del usuario autenticado. **Importante**: Este endpoint también procesa automáticamente los recordatorios de sesiones que empiezan en 1 hora.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "SESSION_CANCELED" | "SESSION_RESCHEDULED" | "SESSION_REMINDER",
    "title": "Sesión cancelada: Yoga Matutino",
    "body": "La sesión programada para 15/11/2024 09:00 ha sido cancelada.",
    "read": false,
    "createdAt": "2024-11-15T10:30:00.000Z",
    "session": {
      "id": "uuid",
      "startAt": "2024-11-15T09:00:00.000Z",
      "classRef": {
        "id": "uuid",
        "title": "Yoga Matutino"
      },
      "branch": {
        "id": "uuid",
        "name": "Sede Centro"
      }
    },
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
]
```

### 2. Obtener Todas las Notificaciones
**GET** `/api/v1/notifications?all=true`

Obtiene todas las notificaciones (leídas y no leídas) del usuario, limitadas a 50 por defecto.

**Query Parameters:**
- `all`: `true` para obtener todas las notificaciones

**Response:** Mismo formato que el endpoint anterior, pero incluye notificaciones leídas.

### 3. Marcar Notificación como Leída
**POST** `/api/v1/notifications/:id/read`

Marca una notificación específica como leída.

**Response:**
```json
{
  "success": true
}
```

### 4. Marcar Todas como Leídas
**POST** `/api/v1/notifications/read-all`

Marca todas las notificaciones del usuario como leídas.

**Response:**
```json
{
  "success": true
}
```

---

## 🎯 Tipos de Notificaciones

### `SESSION_CANCELED`
Se crea cuando una sesión es cancelada. Todos los usuarios con reservas en esa sesión reciben esta notificación.

**Ejemplo:**
```json
{
  "type": "SESSION_CANCELED",
  "title": "Sesión cancelada: Yoga Matutino",
  "body": "La sesión programada para 15/11/2024 09:00 ha sido cancelada. Motivo: Clase suspendida por mantenimiento"
}
```

### `SESSION_RESCHEDULED`
Se crea cuando una sesión es reprogramada (cambia su fecha/hora). Todos los usuarios con reservas reciben esta notificación.

**Ejemplo:**
```json
{
  "type": "SESSION_RESCHEDULED",
  "title": "Sesión reprogramada: Pilates Intermedio",
  "body": "La sesión ha sido reprogramada de 15/11/2024 14:00 a 16/11/2024 14:00."
}
```

### `SESSION_REMINDER`
Se crea automáticamente cuando una sesión está por empezar en 1 hora. **Se procesa cuando el frontend consulta las notificaciones**, no con un cron job.

**Ejemplo:**
```json
{
  "type": "SESSION_REMINDER",
  "title": "Recordatorio: Funcional Avanzado",
  "body": "Tu sesión comienza en 1 hora (15/11/2024 17:00)."
}
```

---

## 💻 Implementación en el Frontend

### Estrategia: Long Polling

El frontend debe consultar periódicamente el endpoint de notificaciones. Se recomienda hacerlo cada **15 minutos** como sugiere la documentación del curso.

### 1. Servicio de Notificaciones

Crea un servicio para manejar las notificaciones:

```typescript
// services/notification.service.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9100/api/v1';

export interface Notification {
  id: string;
  type: 'SESSION_CANCELED' | 'SESSION_RESCHEDULED' | 'SESSION_REMINDER';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  session: {
    id: string;
    startAt: string;
    classRef: {
      id: string;
      title: string;
    };
    branch?: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    email: string;
  };
}

class NotificationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token'); // o donde guardes el token
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const response = await axios.get(
      `${API_BASE_URL}/notifications`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getAllNotifications(): Promise<Notification[]> {
    const response = await axios.get(
      `${API_BASE_URL}/notifications?all=true`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  async markAllAsRead(): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/notifications/read-all`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}

export const notificationService = new NotificationService();
```

### 2. Hook de React para Long Polling

Crea un hook personalizado para manejar el polling:

```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { notificationService, Notification } from '../services/notification.service';

const POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutos en milisegundos

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getUnreadNotifications();
      setNotifications(data);
      setUnreadCount(data.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar inmediatamente
    fetchNotifications();

    // Configurar polling cada 15 minutos
    intervalRef.current = setInterval(() => {
      fetchNotifications();
    }, POLLING_INTERVAL);

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    };
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
};
```

### 3. Componente de Notificaciones

Ejemplo de componente para mostrar las notificaciones:

```typescript
// components/NotificationList.tsx
import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationList: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SESSION_CANCELED':
        return '❌';
      case 'SESSION_RESCHEDULED':
        return '🔄';
      case 'SESSION_REMINDER':
        return '⏰';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notification-list">
      <div className="notification-header">
        <h2>Notificaciones</h2>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p>No tienes notificaciones</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={notification.read ? 'read' : 'unread'}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <span className="icon">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="content">
                <h3>{notification.title}</h3>
                <p>{notification.body}</p>
                <small>
                  {new Date(notification.createdAt).toLocaleString('es-AR')}
                </small>
              </div>
              {!notification.read && <span className="badge">Nuevo</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### 4. Badge de Contador en el Header

Para mostrar el contador de notificaciones no leídas en el header:

```typescript
// components/NotificationBadge.tsx
import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationBadge: React.FC = () => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <div className="notification-badge">
      <span className="icon">🔔</span>
      {unreadCount > 0 && (
        <span className="count">{unreadCount}</span>
      )}
    </div>
  );
};
```

### 5. Integración con React Native (Expo)

Si estás usando React Native con Expo, puedes usar `expo-task-manager` y `expo-background-fetch` para el polling en background:

```typescript
// services/notification.service.native.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

const BACKGROUND_FETCH_TASK = 'background-notification-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const notifications = await fetchNotifications();
    
    // Mostrar notificaciones locales usando expo-notifications
    for (const notification of notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { notificationId: notification.id },
        },
        trigger: null, // Inmediata
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Registrar la tarea
async function registerBackgroundTask() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutos en segundos
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.error('Error registering background task:', error);
  }
}
```

---

## 📱 Flujo de Usuario

1. **Usuario inicia sesión** → El hook `useNotifications` comienza a hacer polling cada 15 minutos
2. **Backend procesa eventos** → Cuando se cancela/reprograma una sesión, se crean notificaciones
3. **Frontend consulta** → Al hacer la petición, el backend también procesa recordatorios (sesiones que empiezan en 1 hora)
4. **Usuario ve notificaciones** → Se muestran en la UI con un badge de contador
5. **Usuario marca como leída** → Se actualiza el estado local y se envía la petición al backend

---

## ⚠️ Consideraciones Importantes

1. **Autenticación**: Todas las peticiones requieren un JWT token válido en el header `Authorization`
2. **Intervalo de Polling**: Se recomienda 15 minutos, pero puedes ajustarlo según tus necesidades
3. **Manejo de Errores**: Implementa retry logic y manejo de errores de red
4. **Optimización**: Considera usar `React.memo` para evitar re-renders innecesarios
5. **Persistencia**: Puedes guardar las notificaciones en AsyncStorage/localStorage para mostrar offline
6. **Notificaciones Push Locales**: En React Native, puedes usar `expo-notifications` para mostrar notificaciones nativas cuando lleguen nuevas

---

## 🧪 Testing

Para probar el sistema:

1. **Cancelar una sesión**: Cancela una sesión desde el backend y verifica que aparezca la notificación
2. **Reprogramar una sesión**: Cambia la fecha/hora de una sesión y verifica la notificación
3. **Recordatorio**: Crea una sesión que empiece en 1 hora, espera y consulta las notificaciones

---

## 📚 Recursos Adicionales

- Documentación de Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Documentación de Expo Task Manager: https://docs.expo.dev/versions/latest/sdk/task-manager/
- Documentación de Expo Background Fetch: https://docs.expo.dev/versions/latest/sdk/background-fetch/

---

## ✅ Checklist de Implementación

- [ ] Crear servicio de notificaciones
- [ ] Implementar hook de long polling
- [ ] Crear componente de lista de notificaciones
- [ ] Agregar badge de contador en el header
- [ ] Implementar marcado como leída
- [ ] Manejar errores y estados de carga
- [ ] Probar con diferentes tipos de notificaciones
- [ ] Optimizar rendimiento (memo, etc.)
- [ ] (Opcional) Implementar notificaciones push locales en React Native

---

**¿Preguntas?** Consulta con el equipo de backend si necesitas aclaraciones sobre los endpoints o el comportamiento del sistema.

