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
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Colors } from '../../constants/colors';
import { registerUser } from '../../utils/api';

const schema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-z0-9._-]+$/, 'Use lowercase letters, numbers, . _ or - only'),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await registerUser({ username: data.username, email: data.email, password: data.password });
      Alert.alert('Success', 'Account created! Please log in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      Alert.alert('Error', msg);
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
        <View className="items-center mb-8">
          <Text className="text-[52px] mb-2">📚</Text>
          <Text className="text-[26px] font-extrabold text-foreground mb-1">Create Account</Text>
          <Text className="text-[15px] text-muted">Start your learning journey</Text>
        </View>

        <View className="gap-1">
          {(
            [
              { name: 'username' as const, label: 'Username', placeholder: 'johndoe', keyboardType: 'default' as const },
              { name: 'email' as const, label: 'Email', placeholder: 'you@example.com', keyboardType: 'email-address' as const },
              { name: 'password' as const, label: 'Password', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
              { name: 'confirm' as const, label: 'Confirm Password', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
            ] as const
          ).map((field) => (
            <View key={field.name}>
              <Text className="text-sm font-semibold text-foreground mt-2.5">{field.label}</Text>
              <Controller
                control={control}
                name={field.name}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className={`bg-surface rounded-[10px] px-3.5 py-3 text-[15px] text-foreground border mt-1 ${
                      errors[field.name] ? 'border-error' : 'border-border'
                    }`}
                    value={value}
                    onChangeText={onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={field.keyboardType}
                    autoCapitalize="none"
                    secureTextEntry={'secure' in field && field.secure}
                  />
                )}
              />
              {errors[field.name] && (
                <Text className="text-xs text-error mt-0.5">{errors[field.name]?.message}</Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            className={`bg-primary rounded-[10px] py-3.5 items-center mt-5 ${isSubmitting ? 'opacity-60' : ''}`}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text className="text-white text-base font-bold">
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-5">
            <Text className="text-muted text-sm">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary text-sm font-bold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
