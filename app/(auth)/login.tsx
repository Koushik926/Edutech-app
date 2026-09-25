import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '../../constants/colors';
import { loginUser } from '../../utils/api';
import { useAuth } from '../../store/authStore';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await loginUser(data);
      await login(res.data.accessToken, res.data.user, res.data.refreshToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={20}
  >
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
      }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
        <View className="items-center mb-10">
          <Text className="text-[52px] mb-2">📚</Text>
          <Text className="text-[28px] font-extrabold text-foreground mb-1">EduTech LMS</Text>
          <Text className="text-[15px] text-muted">Sign in to continue learning</Text>
        </View>

        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-foreground mt-3">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`bg-surface rounded-[10px] px-3.5 py-3 text-[15px] text-foreground border mt-1 ${
                  errors.email ? 'border-error' : 'border-border'
                }`}
                value={value}
                onChangeText={onChange}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && <Text className="text-xs text-error mt-0.5">{errors.email.message}</Text>}

          <Text className="text-sm font-semibold text-foreground mt-3">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`bg-surface rounded-[10px] px-3.5 py-3 text-[15px] text-foreground border mt-1 ${
                  errors.password ? 'border-error' : 'border-border'
                }`}
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
              />
            )}
          />
          {errors.password && <Text className="text-xs text-error mt-0.5">{errors.password.message}</Text>}

          <TouchableOpacity
            className={`bg-primary rounded-[10px] py-3.5 items-center mt-5 ${isSubmitting ? 'opacity-60' : ''}`}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text className="text-white text-base font-bold">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-5">
            <Text className="text-muted text-sm">Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary text-sm font-bold">Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
