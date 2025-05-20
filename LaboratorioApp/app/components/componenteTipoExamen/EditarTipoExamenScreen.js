import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    StyleSheet, 
    Alert, 
    TouchableOpacity, 
    Platform,
    ScrollView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import Toast from 'react-native-toast-message';

const EditarTipoExamenScreen = () => {
    const route = useRoute();
    const { TipoExamen, token } = route.params;
    const navigation = useNavigation();
    const [form, setForm] = useState({
        idTipoExamen: '',
        nombreExamen: '',
        descripcion: '',
        precio: '',
        subtitulos: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/TipoExamen"
        : "http://localhost:5090/api/TipoExamen";

    // Inicializar el formulario con los datos del tipo de examen
    useEffect(() => {
        if (TipoExamen) {
            setForm({
                idTipoExamen: TipoExamen.idtipoExamen,
                nombreExamen: TipoExamen.nombreExamen,
                descripcion: TipoExamen.descripcion || '',
                precio: TipoExamen.precio?.toString() || '',
                subtitulos: TipoExamen.subtitulos || ''
            });
        }
    }, [TipoExamen]);

    const handleChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
        // Limpiar error cuando se edita
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };


    const handleUpdate = async () => {
        if (!form.nombreExamen.trim()) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Nombre requerido',
                text2: 'El nombre del examen es obligatorio',
                visibilityTime: 3000
            });
            return;
        }

        if (form.nombreExamen.trim().length < 3) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Nombre muy corto',
                text2: 'El nombre debe tener al menos 3 caracteres',
                visibilityTime: 3000
            });
            return;
        }
        
        // Validate descripción length
        if (!form.descripcion.trim()) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Descripción requerida',
                text2: 'La descripción es obligatoria',
                visibilityTime: 3000
            });
            return;
        }
        if (form.descripcion.length > 200) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Descripción muy larga',
                text2: 'La descripción no puede exceder los 200 caracteres',
                visibilityTime: 3000
            });
            return;
        }

        // Validate precio
        if (!form.precio.trim()) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Precio requerido',
                text2: 'Debe ingresar un precio para el examen',
                visibilityTime: 3000
            });
            return;
        }

        const precioNumber = parseFloat(form.precio);
        if (isNaN(precioNumber)) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Precio inválido',
                text2: 'El precio debe ser un número válido',
                visibilityTime: 3000
            });
            return;
        }

        if (precioNumber <= 0) {
            Toast.show({
                type: 'warning',
                text1: '🚫 Precio inválido',
                text2: 'El precio debe ser mayor a 0',
                visibilityTime: 3000
            });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const datosActualizados = {
                idtipoExamen: form.idTipoExamen,
                nombreExamen: form.nombreExamen,
                descripcion: form.descripcion,
                precio: parseFloat(form.precio),
                subtitulos: form.subtitulos
            };

            console.log('Enviando datos:', datosActualizados); 
            const response = await fetch(`${API_URL}/${form.idTipoExamen}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datosActualizados) // Solo envía datosActualizados
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar el tipo de examen');
            }

            Toast.show({
                type: 'success',
                text1: '✅ Examen actualizado',
                text2: 'Los cambios se guardaron correctamente',
                visibilityTime: 3000,
                onHide: () => navigation.goBack()
            });
            
        } catch (error) {
            console.error('Error:', error);
            Toast.show({
                type: 'error',
                text1: '❌ Error',
                text2: error.message || 'Ocurrió un error al actualizar',
                visibilityTime: 3000
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Editar Tipo de Examen</Text>
                </View>

                {/* Campo Nombre del Examen */}
                <View style={styles.inputContainer}>
                    <FontAwesome 
                        name="flask" 
                        size={20} 
                        color="#555" 
                        style={styles.icon} 
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del examen"
                        value={form.nombreExamen}
                        onChangeText={text => handleChange('nombreExamen', text)}
                        placeholderTextColor="#999"
                    />
                </View>
                {errors.nombreExamen && (
                    <Text style={styles.errorText}>{errors.nombreExamen}</Text>
                )}

                {/* Campo Descripción */}
                <View style={styles.inputContainer}>
                    <MaterialIcons 
                        name="description" 
                        size={20} 
                        color="#555" 
                        style={styles.icon} 
                    />
                    <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Descripción (opcional)"
                        value={form.descripcion}
                        onChangeText={text => handleChange('descripcion', text)}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Campo Precio */}
                <View style={styles.inputContainer}>
                    <FontAwesome 
                        name="money" 
                        size={20} 
                        color="#555" 
                        style={styles.icon} 
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Precio"
                        value={form.precio}
                        onChangeText={text => handleChange('precio', text)}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#999"
                    />
                </View>
                {errors.precio && (
                    <Text style={styles.errorText}>{errors.precio}</Text>
                )}
                                {/* Campo Subtítulos */}
                                <View style={styles.inputContainer}>
                    <MaterialIcons 
                        name="list" 
                        size={20} 
                        color="#555" 
                        style={styles.icon} 
                    />
                    <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Subtítulos (separados por comas)"
                        value={form.subtitulos}
                        onChangeText={text => handleChange('subtitulos', text)}
                        multiline
                        numberOfLines={2}
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.buttonGroup}>
                    <Button 
                        mode="outlined" 
                        style={styles.cancelButton}
                        labelStyle={styles.cancelButtonText}
                        onPress={() => navigation.goBack()}
                        icon="close"
                    >
                        Cancelar
                    </Button>
                    
                    <Button 
                        mode="contained" 
                        style={styles.submitButton}
                        onPress={handleUpdate}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        icon="content-save"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    icon: {
        marginRight: 10,
        width: 24,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingVertical: 15,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        marginBottom: 15,
        marginLeft: 40,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
        borderColor: '#d32f2f',
        borderWidth: 1,
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#d32f2f',
    },
    submitButton: {
        flex: 2,
        backgroundColor: '#388e3c',
        borderRadius: 8,
        elevation: 2,
    },
});

export default EditarTipoExamenScreen;