import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../store/authStore';
import { useCourses } from '../../store/courseStore';
import { useStudyPlans } from '../../store/studyPlanStore';
import { useToday } from '../../hooks/useToday';
import { studyStreak } from '../../utils/studyPlan';
import { logoutUser } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { bookmarks, enrolled } = useCourses();
  const { plans } = useStudyPlans();
  const today = useToday();
  const streak = useMemo(() => studyStreak(Object.values(plans), today), [plans, today]);

  // There is no upload endpoint, so a picked avatar is kept on-device per user
  // (it used to reset on every restart). Falls back to the user's initial.
  const avatarKey = user ? `profile_avatar:${user._id}` : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setAvatarUrl(null);
    if (!avatarKey) return;
    AsyncStorage.getItem(avatarKey)
      .then((uri) => setAvatarUrl(uri))
      .catch(() => {});
  }, [avatarKey]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutUser();
          } catch {
            // ignore network errors on logout
          }
          await logout();
        },
      },
    ]);
  };

  const handlePickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Allow gallery access'
      );
      return;
    }
    
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setAvatarUrl(imageUri);
      if (avatarKey) AsyncStorage.setItem(avatarKey, imageUri).catch(() => {});
      // TODO: upload to a backend/cloud storage once one exists
    }
  };

  const stats = [
    { label: 'Enrolled', value: enrolled.length, icon: '🎓' },
    { label: 'Bookmarked', value: bookmarks.length, icon: '🔖' },
    { label: 'Day streak', value: streak, icon: '🔥' },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
      <TouchableOpacity
        className="items-center pt-8 pb-6 bg-surface border-b border-border"
        onPress={handlePickImage}
        accessibilityRole="button"
        accessibilityHint="Change profile photo"
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="w-[90px] h-[90px] rounded-full mb-3"
            contentFit="cover"
          />
        ) : (
          <View className="w-[90px] h-[90px] rounded-full bg-primary justify-center items-center mb-3">
            <Text className="text-white text-4xl font-bold">
              {(user?.username ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-xl font-extrabold text-foreground mb-1">
          {user?.username ?? 'User'}
        </Text>
        <Text className="text-[13px] text-muted">{user?.email ?? ''}</Text>
        <Text className="text-[11px] text-primary font-semibold mt-2">Tap to change photo</Text>
      </TouchableOpacity>

      <View className="flex-row m-4 gap-3">
        {stats.map((s) => (
          <View
            key={s.label}
            className="flex-1 bg-surface rounded-xl p-4 items-center border border-border"
          >
            <Text className="text-2xl mb-1">{s.icon}</Text>
            <Text className="text-[22px] font-extrabold text-primary">{s.value}</Text>
            <Text className="text-xs text-muted mt-0.5">{s.label}</Text>
          </View>
        ))}
      </View>

      <View className="bg-surface mx-4 rounded-xl p-4 border border-border mb-4">
        <Text className="text-sm font-bold text-muted mb-3 uppercase tracking-wide">
          Account
        </Text>
        <View className="flex-row justify-between py-2.5 border-b border-border">
          <Text className="text-sm text-muted">Username</Text>
          <Text className="text-sm text-foreground font-semibold">{user?.username}</Text>
        </View>
        <View className="flex-row justify-between py-2.5 border-b border-border">
          <Text className="text-sm text-muted">Email</Text>
          <Text className="text-sm text-foreground font-semibold">{user?.email}</Text>
        </View>
        <View className="flex-row justify-between py-2.5 border-b border-border">
          <Text className="text-sm text-muted">Role</Text>
          <Text className="text-sm text-foreground font-semibold">
            {user?.role ?? 'Student'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="mx-4 bg-primary rounded-[10px] py-3.5 items-center"
        onPress={handleLogout}
      >
        <Text className="text-white text-base font-bold">Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
