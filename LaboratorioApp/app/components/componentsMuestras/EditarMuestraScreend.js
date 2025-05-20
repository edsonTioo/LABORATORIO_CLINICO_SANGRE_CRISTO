import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const EditarMuestraScreen = () => {
    const route = useRoute();
    const { muestra, token } = route.params;
    const navigation = useNavigation();
  
    const [form, setForm] = useState({
        id: muestra.id,
        muestra1: muestra.muestra1.toUpperCase(), // Aseguramos que el valor inicial esté en mayúsculas
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/Muestra"
        : "http://localhost:5090/api/Muestra";

    const handleChange = (text) => {
        // Forzar mayúsculas y limpiar caracteres no permitidos
        const cleanedText = text.toUpperCase().replace(/[^A-Z\s]/g, '');
        setForm(prev => ({ ...prev, muestra1: cleanedText }));
    };

    const validateForm = () => {
        if (!form.muestra1.trim()) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Campo requerido',
                text2: 'El nombre de la muestra es obligatorio',
                visibilityTime: 3000
            });
            return false;
        }
        if (form.muestra1.length < 5) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Longitud incorrecta',
                text2: 'El nombre debe tener al menos 5 caracteres',
                visibilityTime: 3000
            });
            return false;
        }
        return true;
    };

    const handleUpdate = async () => {
        Keyboard.dismiss(); // Ocultar teclado al enviar
        if (!validateForm()) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${API_URL}/${form.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: form.id,
                    muestra1: form.muestra1.trim() // Ya está en mayúsculas
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar muestra');
            }

            Toast.show({
                type: 'success',
                text1: '✅ Muestra actualizada',
                text2: 'Los cambios se guardaron correctamente',
                visibilityTime: 3000,
                onHide: () => navigation.goBack()
            });
        } catch (error) {
            console.error('Error:', error);
            Toast.show({
                type: 'error',
                text1: '❌ Error al actualizar',
                text2: error.message || 'Ocurrió un error al guardar los cambios',
                visibilityTime: 3000
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Editar Muestra</Text>

            <View style={styles.inputContainer}>
                <Ionicons name="flask-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="EJ: SANGRE, ORINA, HECES"
                    value={form.muestra1}
                    onChangeText={handleChange}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    maxLength={50}
                />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => navigation.goBack()} 
                    disabled={isSubmitting}
                >
                    <Ionicons name="close-circle-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.button, styles.submitButton]}
                    onPress={handleUpdate} 
                    disabled={isSubmitting}
                >
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>
                        {isSubmitting ? "Actualizando..." : "Actualizar"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// Estilos permanecen igual...

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center',
        color: '#3a0ca3',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderColor: '#ced4da',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 20,
    },
    inputIcon: {
        marginLeft: 12,
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 12,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '48%',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    submitButton: {
        backgroundColor: '#3a0ca3',
    },
    buttonText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: '600',
    },
});

export default EditarMuestraScreen;