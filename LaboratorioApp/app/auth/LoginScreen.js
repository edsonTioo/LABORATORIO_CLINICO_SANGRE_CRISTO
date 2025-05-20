  import React, { useState } from "react";
  import {
    Platform,
    StyleSheet,
    Text,
    View,
    TextInput,
    Dimensions,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    ScrollView,
  } from "react-native";
  import { LinearGradient } from "expo-linear-gradient";
  import ButtonGradient from "./ButtonGradient";
  import Toast from "react-native-toast-message";
  import RestablecerScreen from "./RestablecerScreen";
  import { MaterialIcons } from '@expo/vector-icons';

  const { width, height } = Dimensions.get("window");

  export default function LoginScreen({ navigation, onLoginSuccess }) {
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isFocusedEmail, setIsFocusedEmail] = useState(false);
    const [isFocusedPassword, setIsFocusedPassword] = useState(false);

    const API_AUT =
      Platform.OS === "android"
        ? "http://10.0.2.2:5090/api/Auth/login"
        : "http://localhost:5090/api/Auth/login";

    const validateEmail = (email) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(String(email).toLowerCase());
    };

    const handleLogin = async () => {
      if (!correo) {
        Toast.show({
          type: "warning",
          text1: "🚫 Error",
          text2: "El correo es requerido",
          visibilityTime: 3000,
        });
        return false;
      }

      if (!validateEmail(correo)) {
        Toast.show({
          type: "warning",
          text1: "🚫 Error",
          text2: "Ingrese un correo válido",
          visibilityTime: 3000,
        });
        return false;
      }

      if (!password) {
        Toast.show({
          type: "warning",
          text1: "🚫 Error",
          text2: "La contraseña es requerida",
          visibilityTime: 3000,
        });
        return false;
      }

      try {
        const response = await fetch(API_AUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correo: correo,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Credenciales incorrectas");
        }

        onLoginSuccess({
          token: data.token,
          idMedico: data.idMedico,
          nombre: data.nombre,
          correo: data.correo,
          rol: data.rol,
        });
        
        Toast.show({
          type: "success",
          text1: "✅ Éxito",
          text2: "Inicio de sesión correcto",
          visibilityTime: 2000,
        });
      } catch (error) {
        console.error("Login error:", error);
        Toast.show({
          type: 'error',
          text1: '❌ Error',
          text2: error.message || 'Error al iniciar sesión',
          visibilityTime: 3000
        });
      }
    };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/labo.jpeg")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

            <View style={styles.inputContainer}>
              <MaterialIcons 
                name="email" 
                size={20} 
                color={isFocusedEmail ? "#3498db" : "#999"} 
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
                value={correo}
                onChangeText={setCorreo}
                style={[
                  styles.input,
                  isFocusedEmail && styles.inputFocused
                ]}
                onFocus={() => setIsFocusedEmail(true)}
                onBlur={() => setIsFocusedEmail(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons 
                name="lock" 
                size={20} 
                color={isFocusedPassword ? "#3498db" : "#999"} 
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[
                  styles.input,
                  isFocusedPassword && styles.inputFocused
                ]}
                onFocus={() => setIsFocusedPassword(true)}
                onBlur={() => setIsFocusedPassword(false)}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <MaterialIcons 
                  name={showPassword ? "visibility-off" : "visibility"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("Restablecer")}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <ButtonGradient 
                text="Iniciar sesión" 
                onPress={handleLogin} 
              />
            </View>

          
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  backgroundColor: "#2c3e50", // ← color de fondo sólido
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  formContainer: {
    width: Platform.select({
      web: width > 768 ? "40%" : "85%",
      default: "85%",
    }),
    maxWidth: 450,
    minWidth: 300,
    padding: 30,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    ...Platform.select({
      web: {
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
      },
      default: {
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
    }),
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 280,
    height: 280,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  inputFocused: {
    borderColor: '#3498db',
  },
  passwordToggle: {
    padding: 10,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#3498db",
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    alignItems: 'center',
  },
  footerText: {
    color: "#7f8c8d",
    fontSize: 14,
  },
});