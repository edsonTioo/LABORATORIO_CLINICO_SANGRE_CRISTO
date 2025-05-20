import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const CrearMuestraScreen = () => {
    const [form, setForm] = useState({
        muestra1: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigation = useNavigation();

    const API_URL = Platform.OS === 'android'
        ? 'http://10.0.2.2:5090/api/Muestra'
        : 'http://localhost:5090/api/Muestra';

    // Manejar cambios con validación
    const handleChange = (text) => {
        const cleanedText = text.toUpperCase().replace(/[^A-Z\s]/g, '');
        setForm(prev => ({ ...prev, muestra1: cleanedText }));
    };

    // Validar formulario
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

    const handleSubmit = async () => {
        if (!validateForm()) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    muestra1: form.muestra1.trim().toUpperCase()
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear muestra');
            }

            Toast.show({
                type: 'success',
                text1: '✅ Muestra creada',
                text2: 'La muestra se registró correctamente',
                visibilityTime: 3000,
                onHide: () => navigation.goBack()
            });
            
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: '❌ Error al crear',
                text2: error.message || 'Ocurrió un error al crear la muestra',
                visibilityTime: 3000
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Crear Nueva Muestra</Text>

            <View style={styles.inputContainer}>
                <Ionicons name="flask-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="EJ: SANGRE, ORINA, HECES"
                    value={form.muestra1}
                    onChangeText={handleChange}
                    autoCapitalize="characters"
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
                    onPress={handleSubmit} 
                    disabled={isSubmitting}
                >
                    <Ionicons name="add-circle-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>
                        {isSubmitting ? "Creando..." : "Crear Muestra"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// Reutilizamos los mismos estilos que en EditarMuestraScreen
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

export default CrearMuestraScreen;