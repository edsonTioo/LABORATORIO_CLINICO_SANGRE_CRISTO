import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UpdatePasswordScreen = ({ route }) => {
  const { userData } = route.params;
  const [medico, setMedico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [error, setError] = useState('');
  const [secureEntry, setSecureEntry] = useState({
    current: true,
    new: true,
    confirm: true
  });

  const API_URL = Platform.OS === 'android'
    ? "http://10.0.2.2:5090/api/MedicoUser"
    : "http://localhost:5090/api/MedicoUser";

  const fetchPerfil = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${userData.idMedico}`);
      const data = await response.json();
      setMedico(data);
    } catch (err) {
      console.error("Error fetching medico data:", err);
      setError('Error al cargar los datos del médico');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const API_URL_password = Platform.OS === 'android'
      ? "http://10.0.2.2:5090/api/MedicoPassword"
      : "http://localhost:5090/api/MedicoPassword";

    try {
      setLoading(true);
      const response = await fetch(`${API_URL_password}/${userData.idMedico}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la contraseña');
      }

      setError('');
      setShowPasswordFields(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Éxito', 'Contraseña actualizada exitosamente');
    } catch (err) {
      console.error("Error updating password:", err);
      setError(err.message || 'Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  if (loading && !medico) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Información del usuario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Nombre de usuario</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="black" style={styles.icon} />
              <TextInput
                value={medico?.nombre || ''}
                style={styles.input}
                editable={false}
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="black" style={styles.icon} />
              <TextInput
                value={medico?.correo || ''}
                style={styles.input}
                editable={false}
                placeholderTextColor="#666"
              />
            </View>
          </View>
        </View>

        {/* Cambio de contraseña */}
        {!showPasswordFields ? (
          <View style={styles.section}>
            <TouchableOpacity 
              onPress={() => setShowPasswordFields(true)}
              style={styles.primaryButton}
            >
              <Text style={styles.buttonText}>Cambiar contraseña</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Contraseña actual</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="black" style={styles.icon} />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={styles.input}
                  secureTextEntry={secureEntry.current}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity 
                  onPress={() => setSecureEntry({...secureEntry, current: !secureEntry.current})}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={secureEntry.current ? "eye-off" : "eye"} 
                    size={20} 
                    color="black" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nueva contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="black" style={styles.icon} />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                  secureTextEntry={secureEntry.new}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity 
                  onPress={() => setSecureEntry({...secureEntry, new: !secureEntry.new})}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={secureEntry.new ? "eye-off" : "eye"} 
                    size={20} 
                    color="black" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Confirmar nueva contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color="black" style={styles.icon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry={secureEntry.confirm}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity 
                  onPress={() => setSecureEntry({...secureEntry, confirm: !secureEntry.confirm})}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={secureEntry.confirm ? "eye-off" : "eye"} 
                    size={20} 
                    color="black" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                onPress={() => {
                  setShowPasswordFields(false);
                  setError('');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdatePassword}
                style={styles.primaryButton}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c3e50",
  },
  scrollContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: 'black',
    marginBottom: 5,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: 'black',
    paddingVertical: 10,
  },
  eyeIcon: {
    padding: 5,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default UpdatePasswordScreen;