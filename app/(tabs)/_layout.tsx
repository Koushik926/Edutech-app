import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: boolean, active: IconName, inactive: IconName) {
  return <Ionicons name={focused ? active : inactive} size={24} color={focused ? Colors.primary : Colors.textSecondary} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        headerStyle: { backgroundColor: Colors.primary },
        headerTitleStyle: { color: Colors.surface, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'book', 'book-outline'),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: 'My Learning',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'school', 'school-outline'),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'bookmark', 'bookmark-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
