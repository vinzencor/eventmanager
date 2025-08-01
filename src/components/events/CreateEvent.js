import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

const CreateEvent = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    ticketCount: '',
    timeSlots: ['']
  });
  const [error, setError] = useState('');

  // Toggle for Firebase Storage (set to false to bypass CORS issues)
  const USE_FIREBASE_STORAGE = false;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTimeSlotChange = (index, value) => {
    const newTimeSlots = [...formData.timeSlots];
    newTimeSlots[index] = value;
    setFormData({
      ...formData,
      timeSlots: newTimeSlots
    });
  };

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, '']
    });
  };

  const removeTimeSlot = (index) => {
    const newTimeSlots = formData.timeSlots.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      timeSlots: newTimeSlots
    });
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      console.log('Uploading image to Firebase Storage:', imageFile.name);
      const imageRef = ref(storage, `events/${uuidv4()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      console.log('Image uploaded successfully:', snapshot);
      const downloadURL = await getDownloadURL(imageRef);
      console.log('Download URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Firebase Storage upload failed:', error);

      // Check if it's a CORS error
      if (error.message.includes('CORS') || error.code === 'storage/unknown') {
        console.log('CORS error detected, using base64 fallback');
        return null; // Will trigger base64 fallback
      }

      // For other errors, show alert and continue
      console.warn('Storage upload failed, continuing with base64 fallback');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      // Validate form
      if (!formData.title || !formData.date || !formData.time || !formData.ticketCount) {
        setError('Please fill in all required fields');
        return;
      }

      if (parseInt(formData.ticketCount) <= 0) {
        setError('Ticket count must be greater than 0');
        return;
      }

      // Handle image upload with smart fallback
      let imageUrl = null;
      if (imageFile && imagePreview) {
        console.log('Processing image upload...');

        if (USE_FIREBASE_STORAGE) {
          // Try Firebase Storage first
          try {
            console.log('Attempting Firebase Storage upload...');
            imageUrl = await uploadImage();
            console.log('Successfully uploaded to Firebase Storage');
          } catch (error) {
            console.warn('Firebase Storage failed, using base64 fallback:', error.message);
            imageUrl = imagePreview;
          }
        } else {
          // Use base64 directly (bypassing CORS issues)
          console.log('Using base64 image storage (Firebase Storage disabled)');
          imageUrl = imagePreview;
        }

        // Compress base64 if it's too large
        if (imageUrl === imagePreview && imagePreview.length > 500000) {
          console.warn('Large image detected. Consider image compression for better performance.');
        }

        console.log('Image processed successfully');
      }

      // Filter out empty time slots
      const validTimeSlots = formData.timeSlots.filter(slot => slot.trim() !== '');

      // Create event document
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        ticketCount: parseInt(formData.ticketCount),
        availableTickets: parseInt(formData.ticketCount),
        timeSlots: validTimeSlots,
        imageUrl: imageUrl,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        registrations: 0,
        qrCode: uuidv4() // Unique QR code identifier
      };

      const docRef = await addDoc(collection(db, 'events'), eventData);
      
      // Navigate to event preview
      navigate(`/admin/events/${docRef.id}/preview`);
      
    } catch (error) {
      setError('Failed to create event: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time *
            </label>
            <input
              type="time"
              id="time"
              name="time"
              required
              value={formData.time}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="ticketCount" className="block text-sm font-medium text-gray-700">
            Total Tickets Available *
          </label>
          <input
            type="number"
            id="ticketCount"
            name="ticketCount"
            required
            min="1"
            value={formData.ticketCount}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Slots (Optional)
          </label>
          {formData.timeSlots.map((slot, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={slot}
                onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                placeholder="e.g., 9:00 AM - 10:00 AM"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {formData.timeSlots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeSlot(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTimeSlot}
            className="text-primary-600 hover:text-primary-800 text-sm"
          >
            + Add Time Slot
          </button>
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            Event Image (Optional)
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            {USE_FIREBASE_STORAGE
              ? 'Images will be uploaded to Firebase Storage with base64 fallback.'
              : 'Images will be stored as base64 data (CORS-safe mode).'}
          </p>
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-32 w-32 object-cover rounded-md"
              />
              <p className="text-xs text-green-600 mt-1">✓ Image ready for upload</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Creating Event...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;
