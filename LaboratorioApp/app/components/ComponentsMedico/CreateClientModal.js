import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Platform, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { DatePickerModal } from 'react-native-paper-dates';
import { Button } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {
  MaterialIcons,
  FontAwesome,
  MaterialCommunityIcons,
  Ionicons
} from '@expo/vector-icons';

const API_URL = Platform.OS === "android" 
  ? "http://10.0.2.2:5090/api/Paciente" 
  : "http://localhost:5090/api/Paciente";

const CreateClientModal = ({ visible, onClose, onClientCreated }) => {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    fechaNacimiento: '',
    genero: ''
  });
  
  const [showPicker, setShowPicker] = useState(false);
  const [isFocusGenero, setIsFocusGenero] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const generoOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
    { label: 'Otro', value: 'O' }
  ];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.nombre || !form.telefono || !form.fechaNacimiento || !form.genero) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Todos los campos son requeridos',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: form.nombre.toUpperCase(),
          telefono: form.telefono,
          fechaNacimiento: form.fechaNacimiento,
          genero: form.genero
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear el cliente');
      }

      const data = await response.json();
      
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Cliente creado correctamente',
      });
      
      onClientCreated(data);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo crear el cliente',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      nombre: '',
      telefono: '',
      fechaNacimiento: '',
      genero: ''
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Nuevo Cliente</Text>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            {/* Campo Nombre */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Nombre Completo</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person"
                  size={24}
                  color="#555"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="NOMBRE COMPLETO (EN MAYÚSCULAS)"
                  value={form.nombre}
                  onChangeText={(text) => handleChange("nombre", text)}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Campo Teléfono */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="phone"
                  size={22}
                  color="#555"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="TELEFONO"
                  value={form.telefono}
                  onChangeText={(text) => handleChange("telefono", text)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Campo Fecha de Nacimiento */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Fecha de Nacimiento</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowPicker(true)}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={22}
                  color="#555"
                  style={styles.icon}
                />
                <View style={styles.dateInput}>
                  <Text style={{ color: form.fechaNacimiento ? "#000" : "#888" }}>
                    {form.fechaNacimiento || "FECHA DE NACIMIENTO"}
                  </Text>
                </View>
              </TouchableOpacity>
              <DatePickerModal
                locale="es"
                mode="single"
                visible={showPicker}
                onDismiss={() => setShowPicker(false)}
                date={form.fechaNacimiento ? new Date(form.fechaNacimiento) : new Date()}
                onConfirm={({ date }) => {
                  setShowPicker(false);
                  const isoString = date.toISOString().split("T")[0];
                  handleChange("fechaNacimiento", isoString);
                }}
              />
            </View>

            {/* Campo Género */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Género</Text>
              <View style={styles.inputContainer}>
                <FontAwesome 
                  name="transgender" 
                  size={22} 
                  color="#555" 
                  style={styles.icon} 
                />
                <Dropdown
                  style={[styles.dropdown, isFocusGenero && { borderColor: '#3a0ca3' }]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  data={generoOptions}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="SELECCIONE UN GENERO"
                  value={form.genero}
                  onFocus={() => setIsFocusGenero(true)}
                  onBlur={() => setIsFocusGenero(false)}
                  onChange={item => {
                    handleChange("genero", item.value);
                    setIsFocusGenero(false);
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botones */}
        <View style={styles.buttonGroup}>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonText}
            onPress={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="check"
          >
            Guardar Cliente
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 6,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  dateInput: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
  },
  dropdown: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
  },
  placeholderStyle: {
    color: '#bdc3c7',
    fontSize: 15,
  },
  selectedTextStyle: {
    color: '#2c3e50',
    fontSize: 15,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#e74c3c',
  },
  cancelButtonText: {
    color: '#e74c3c',
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#2ecc71',
  },
});

export default CreateClientModal;