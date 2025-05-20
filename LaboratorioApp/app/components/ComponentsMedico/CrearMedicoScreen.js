import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import Toast from 'react-native-toast-message';

const CrearMedicoScreen = () => {
    const [form, setForm] = useState({
        nombre: '',
        especialidad: '',
        password: '',
        telefono: '',
        correo: '',
        rol: ''
    });

    const [errors, setErrors] = useState({
        nombre: '',
        especialidad: '',
        password: '',
        telefono: '',
        correo: '',
        rol: ''
    });

    const [rol, setRol] = useState([]);
    const [isFocus, setIsFocus] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    const API_URL = Platform.OS === 'android'
        ? "http://10.0.2.2:5090/api/MedicoUser"
        : "http://localhost:5090/api/MedicoUser";



    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'nombre':
                if (!/^[A-Z\s]+$/.test(value)) {
                    error = 'Solo letras mayúsculas y sin caracteres especiales';
                } else if (value.trim().length < 5) {
                    error = 'Mínimo 5 caracteres';
                }
                break;
            case 'especialidad':
                if (!/^[A-Z\s]+$/.test(value)) {
                    error = 'Solo letras mayúsculas y sin caracteres especiales';
                } else if (value.trim().length < 5) {
                    error = 'Mínimo 5 caracteres';
                }

                break;
            case 'password':
                if (value.trim() === '') {
                    error = 'La contraseña no puede estar vacía';
                }
                break;
            case 'telefono':
                if (!/^\d{8}$/.test(value)) {
                    error = 'Debe tener exactamente 8 dígitos';
                }
                break;
            case 'correo':
                if (value.trim() === '') {
                    error = 'El correo no puede estar vacío';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Correo electrónico inválido';
                }
                break;
            case 'rol':
                if (!value) {
                    error = 'Debe seleccionar un rol';
                }
                break;
        }

        setErrors(prev => ({ ...prev, [name]: error }));
        return error === '';
    };

    const handleChange = (name, value) => {
        let processedValue = value;

        if (name === 'nombre' || name === 'especialidad') {
            processedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
        } else if (name === 'telefono') {
            processedValue = value.replace(/[^0-9]/g, '').slice(0, 8);
        }

        setForm(prev => ({ ...prev, [name]: processedValue }));
        validateField(name, processedValue);
    };

    const handleSubmit = async () => {
        const isValid = Object.keys(form).every(field => {
            return validateField(field, form[field]);
        });

        if (!isValid) {
            Toast.show({
                type: 'warning',
                text1: '🚫Error de validación',
                text2: 'Por favor corrige los errores en el formulario',
                position: 'top',
                visibilityTime: 4000
            });
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            console.log('Response:', response);
            if (response.ok) {
                Toast.show({
                    type: 'success',
                    text1: '✅Éxito',
                    text2: 'Médico creado correctamente',
                    position: 'top',
                    visibilityTime: 3000,
                    onHide: () => navigation.goBack()
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear médico');
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: '❌Error',
                text2: error.message,
                position: 'top',
                visibilityTime: 4000
            });
        }
    };
    const rolesData = [
        { label: 'ADMIN', value: 'ADMIN' },
        { label: 'EMPLEADO', value: 'EMPLEADO' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>Crear Nuevo Médico</Text>

                {/* Campo Nombre */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="person" size={24} color="#666" style={styles.icon} />
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="NOMBRE"
                            value={form.nombre}
                            onChangeText={text => handleChange('nombre', text)}
                            maxLength={50}
                        />
                        {errors.nombre ? <Text style={styles.errorText}>{errors.nombre}</Text> : null}
                    </View>
                </View>

                {/* Campo Especialidad */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="medical-services" size={24} color="#666" style={styles.icon} />
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="ESPECIALIDAD"
                            value={form.especialidad}
                            onChangeText={text => handleChange('especialidad', text)}
                            maxLength={50}
                        />
                        {errors.especialidad ? <Text style={styles.errorText}>{errors.especialidad}</Text> : null}
                    </View>
                </View>

               

                {/* Campo Contraseña */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="lock" size={24} color="#666" style={styles.icon} />
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="CONTRASEÑA"
                            value={form.password}
                            onChangeText={text => handleChange('password', text)}
                            secureTextEntry
                        />
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                    </View>
                </View>

            

                {/* Campo Teléfono */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="phone" size={24} color="#666" style={styles.icon} />
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="TELÉFONO"
                            value={form.telefono}
                            onChangeText={text => handleChange('telefono', text)}
                            keyboardType="phone-pad"
                            maxLength={8}
                        />
                        {errors.telefono ? <Text style={styles.errorText}>{errors.telefono}</Text> : null}
                    </View>
                </View>

                {/* Dropdown Rol */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="supervised-user-circle" size={24} color="#666" style={styles.icon} />
                    <View style={styles.dropdownWrapper}>
                        <View style={styles.dropdownWrapper}>
                            <Dropdown
                                style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconStyle={styles.iconStyle}
                                data={rolesData}
                                search
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder={!isFocus ? 'SELECCIONE ROL' : '...'}
                                searchPlaceholder="Buscar..."
                                value={form.rol}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setIsFocus(false)}
                                onChange={item => {
                                    handleChange('rol', item.value);
                                    setIsFocus(false);
                                }}
                            />
                            {errors.rol ? <Text style={styles.errorText}>{errors.rol}</Text> : null}
                        </View>
                    </View>
                </View>

                {/* Campo Correo */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="email" size={24} color="#666" style={styles.icon} />
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="CORREO ELECTRÓNICO"
                            value={form.correo}
                            onChangeText={text => handleChange('correo', text)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.correo ? <Text style={styles.errorText}>{errors.correo}</Text> : null}
                    </View>
                </View>

                {/* Botones */}
                <View style={styles.buttonContainer}>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Cancelar"
                            onPress={() => navigation.goBack()}
                            color="#f44336"
                        />
                    </View>
                    <View style={styles.buttonWrapper}>
                        <Button
                            title="Guardar"
                            onPress={handleSubmit}
                            color="#4CAF50"
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
        margin: 20
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 25,
        textAlign: 'center',
        color: '#333'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    inputWrapper: {
        flex: 1,
    },
    dropdownWrapper: {
        flex: 1,
    },
    icon: {
        marginRight: 12,
        color: '#555'
    },
    input: {
        height: 48,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9'
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 13,
        marginTop: 4,
        marginLeft: 4
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 25,
        paddingHorizontal: 10
    },
    buttonWrapper: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 8,
        overflow: 'hidden'
    },
    /* Estilos para el Dropdown */
    dropdown: {
        height: 48,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9f9f9'
    },
    dropdownLeftIcon: {
        marginRight: 8,
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#888'
    },
    selectedTextStyle: {
        fontSize: 16,
        color: '#333'
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
        color: '#333',
        borderRadius: 8,
        borderColor: '#ddd',
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    iconStyle: {
        width: 24,
        height: 24,
    },
});

export default CrearMedicoScreen;