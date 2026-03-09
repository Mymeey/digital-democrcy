import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStore, OPERATOR_USER_ID } from '../store/useStore';
import LoginScreen from '../screens/LoginScreen';
import VerificationScreen from '../screens/VerificationScreen';
import OrganizationSetupScreen from '../screens/OrganizationSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import PostScreen from '../screens/PostScreen';
import AdminScreen from '../screens/AdminScreen';
import OperatorScreen from '../screens/OperatorScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// メインタブナビゲーション
function MainTabs() {
  const user = useStore((state) => state.user);
  const currentOrganization = useStore((state) => state.currentOrganization);
  
  // 運営者かどうか
  const isOperator = user?.id === OPERATOR_USER_ID || user?.role === 'operator';
  // 組織管理者かどうか
  const isOrgAdmin = user?.id === currentOrganization?.adminUserId || user?.role === 'org_admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Post"
        component={PostScreen}
        options={{
          tabBarLabel: '投稿',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'create' : 'create-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      {/* 運営者用タブ（本人確認審査） */}
      {isOperator && (
        <Tab.Screen
          name="Operator"
          component={OperatorScreen}
          options={{
            tabBarLabel: '運営',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      )}
      {/* 組織管理者用タブ（意見への返答） */}
      {isOrgAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarLabel: '管理',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons 
                name={focused ? 'settings' : 'settings-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'プロフィール',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person-circle' : 'person-circle-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const user = useStore((state) => state.user);
  const currentOrganization = useStore((state) => state.currentOrganization);

  // ユーザーがログインしていない場合
  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 組織未選択の場合（運営者は組織選択不要）
  const isOperator = user.id === OPERATOR_USER_ID || user.role === 'operator';
  if (!isOperator && !user.organizationId && !user.pendingOrganizationId) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="OrganizationSetup" component={OrganizationSetupScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // ユーザーが承認されていない場合（本人確認待ち）
  if (!isOperator && user.status !== 'approved') {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Verification" component={VerificationScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // 承認済みユーザー or 運営者
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
