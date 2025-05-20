import React, { useState } from 'react';
import { View, TextInput, Text, Alert, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Platform, Image, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const RestablecerScreen = ({ navigation }) => { 
  const [correo, setCorreo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!correo) {
      Alert.alert('Error', 'Por favor ingrese su correo electrónico');
      return;
    }

    // Validación simple de email
    if (!correo.includes('@') || !correo.includes('.')) {
      Alert.alert('Error', 'Por favor ingrese un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    const API_URL = Platform.OS === 'android'
      ? "http://10.0.2.2:5090/api/Restablecer/solicitar"
      : "http://localhost:5090/api/Restablecer/solicitar";
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo }),
      });

      const data = await response.json();

      if (data.Exito) {
        Alert.alert('Éxito', data.Mensaje);
        navigation.goBack(); // Regresa al login después de éxito
      } else {
        Alert.alert('Error', data.Mensaje);
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error. Por favor intenta nuevamente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View // Degradado más profundo
        style={styles.container}
      >
        {/* Botón de regreso */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/labo.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Restablecer Contraseña</Text>
          <Text style={styles.subtitle}>Ingresa tu correo para recibir instrucciones</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={correo}
            onChangeText={setCorreo}
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity 
            style={[styles.buttonContainer, isLoading && styles.disabledButton]} 
            onPress={handleSubmit} 
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#007AFF', '#0047AB']}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar Instrucciones</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Volver al Inicio de Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
 
 backgroundColor: "#2c3e50", // ← color de fondo sólido
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  formContainer: {
    width: Platform.select({
      web: width > 768 ? '40%' : '80%',
      default: '90%',
    }),
    maxWidth: 500,
    minWidth: 300,
    padding: 30,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  buttonGradient: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default RestablecerScreen;