# Ejemplo Completo: React Native con Expo

## Configuración Inicial

### 1. Instalar Dependencias

```bash
npx expo install expo-notifications expo-task-manager expo-background-fetch
```

### 2. Configurar app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

---

## Implementación Completa

### 1. Servicio de Notificaciones

```typescript
// services/notification.service.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:9100/api/v1'; // Cambiar por tu URL

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
}

class NotificationService {
  private async getAuthHeaders() {
    const token = await SecureStore.getItemAsync('authToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/notifications`,
        { headers: await this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {},
        { headers: await this.getAuthHeaders() }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/read-all`,
        {},
        { headers: await this.getAuthHeaders() }
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
```

### 2. Hook de Notificaciones con Background Task

```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { notificationService, Notification } from '../services/notification.service';

const BACKGROUND_FETCH_TASK = 'background-notification-fetch';
const POLLING_INTERVAL = 15 * 60 * 1000; // 15 minutos

// Configurar cómo se muestran las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Definir la tarea de background
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const notifications = await notificationService.getUnreadNotifications();
    
    // Mostrar notificaciones locales para las nuevas
    for (const notification of notifications) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { notificationId: notification.id },
          sound: true,
        },
        trigger: null, // Inmediata
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadNotifications();
      setNotifications(data);
      setUnreadCount(data.length);
      
      // Mostrar notificaciones locales si hay nuevas
      const previousCount = notifications.length;
      if (data.length > previousCount) {
        const newNotifications = data.slice(0, data.length - previousCount);
        for (const notification of newNotifications) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.body,
              data: { notificationId: notification.id },
            },
            trigger: null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [notifications.length]);

  useEffect(() => {
    // Solicitar permisos de notificaciones
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    };
    requestPermissions();

    // Registrar background task
    const registerBackgroundTask = async () => {
      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 15 * 60, // 15 minutos en segundos
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch (error) {
        console.error('Error registering background task:', error);
      }
    };
    registerBackgroundTask();

    // Cargar notificaciones inmediatamente
    fetchNotifications();

    // Configurar polling cuando la app está activa
    intervalRef.current = setInterval(() => {
      if (appState.current === 'active') {
        fetchNotifications();
      }
    }, POLLING_INTERVAL);

    // Escuchar cambios de estado de la app
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App viene al foreground, actualizar notificaciones
        fetchNotifications();
      }
      appState.current = nextAppState;
    });

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

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

### 3. Componente de Lista de Notificaciones

```typescript
// components/NotificationList.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationList: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadItem,
      ]}
      onPress={() => !item.read && markAsRead(item.id)}
    >
      <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.badge} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllButton}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  markAllButton: {
    color: '#007AFF',
    fontSize: 14,
  },
  list: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  unreadItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
```

### 4. Badge en el Tab Navigator

```typescript
// navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';

const Tab = createBottomTabNavigator();

const NotificationBadge: React.FC = () => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};

export const TabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationList}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Icon name="bell" size={size} color={color} />
              <NotificationBadge />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
```

---

## Manejo de Notificaciones al Tocar

```typescript
// App.tsx o donde configures las notificaciones
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

export default function App() {
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Cuando se recibe una notificación en foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    // Cuando el usuario toca una notificación
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        
        // Navegar a la pantalla de notificaciones o detalles
        if (data?.notificationId) {
          navigation.navigate('Notifications', {
            notificationId: data.notificationId,
          });
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);

  // ... resto de tu app
}
```

---

## Resumen de la Implementación

1. **Servicio**: Maneja todas las peticiones HTTP al backend
2. **Hook**: Gestiona el estado, polling y background tasks
3. **Componentes**: UI para mostrar las notificaciones
4. **Navegación**: Integración con el sistema de navegación
5. **Background**: Tareas que se ejecutan aunque la app esté cerrada

¡Listo para implementar! 🚀

