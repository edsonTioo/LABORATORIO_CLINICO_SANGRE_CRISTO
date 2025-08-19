import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

function CerrarSesionScreen({ navigation, route }) {
  const { onLogout } = route.params;

const handleConfirm = () => {
  onLogout();  // Este es el paso que debe actualizar el estado
  navigation.reset({
    index: 0,
    routes: [{ name: 'LoginScreen' }],
  });
};


  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        <Text style={styles.title}>¿Quieres cerrar sesión?</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.yesButton]} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Sí</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.noButton]} onPress={handleCancel}>
            <Text style={styles.buttonText}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo oscuro semi-transparente
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 40,  // Aumentamos el espacio vertical
    paddingHorizontal: 25, // Reducimos el espacio horizontal
    width: '80%',  // Menos ancho
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 10, // Sombra para Android
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30, // Aumentamos el margen inferior para más espacio
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#e74c3c', // rojo
  },
  noButton: {
    backgroundColor: '#2ecc71', // verde
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CerrarSesionScreen;
