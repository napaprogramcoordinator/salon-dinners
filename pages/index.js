import { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, AlertCircle, X, Edit, Clock, Mail, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';


const SalonDinners = () => {
  // Initialize Supabase client
  const supabase = createClient(
    'https://zqpawrdblhxllmfpygkk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcGF3cmRibGh4bGxtZnB5Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTgyODQsImV4cCI6MjA4MzQ3NDI4NH0.qtekiX3TY-y6T5i1acSNwuXWwaiOL5OVtFbPEODKpvs'
  );

  const [currentPage, setCurrentPage] = useState('public');
  const [step, setStep] = useState('landing');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    professionalTitle: '',
    bio: '',
    foodAllergies: '',
    picture: null,
    picturePreview: null,
    publications: []
  });
  const [inviteFormData, setInviteFormData] = useState({
    name: '',
    email: ''
  });
  const [classification, setClassification] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [registrations, setRegistrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [makeWebhookUrl, setMakeWebhookUrl] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [editingRegistrant, setEditingRegistrant] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAlert, setShowAlert] = useState(null);
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [preferredDates, setPreferredDates] = useState([]);
  const [waitlistData, setWaitlistData] = useState([]);
  const [movingFromWaitlist, setMovingFromWaitlist] = useState(null);
  const [showRemoveOptions, setShowRemoveOptions] = useState(null);
  const [inviteList, setInviteList] = useState([]);
  const [showWaitlistRemoveOptions, setShowWaitlistRemoveOptions] = useState(null);

  const ADMIN_PASSWORD = 'salon2026';

  // Scroll to top whenever step changes

  // ============================================
  // SUPABASE HELPER FUNCTIONS
  // ============================================
  
  // Convert Supabase data to app format
  const convertSupabaseToAppFormat = (supabaseData) => {
    const formatted = {};
    
    // Initialize empty structure
    eventDates.forEach(date => {
      formatted[date.id] = { liberal: [], moderate: [], conservative: [] };
    });
    
    // Fill with actual data
    supabaseData.forEach(row => {
      // Find the date ID from the label
      const dateInfo = eventDates.find(d => d.label === row.event_date);
      const dateId = dateInfo ? dateInfo.id : 'date1';
      
      const classification = (row.classification || 'moderate').toLowerCase();
      
      if (formatted[dateId] && formatted[dateId][classification]) {
        formatted[dateId][classification].push({
          name: row.name,
          email: row.email,
          phone: row.phone || '',
          professionalTitle: row.professional_title || '',
          bio: row.bio || '',
          foodAllergies: row.food_allergies || '',
          picture: row.photo_link || '',
          timestamp: row.registration_date || row.created_at
        });
      }
    });
    
    return formatted;
  };

  // Convert app format to Supabase row
  const convertAppToSupabaseRow = (person, dateId, classification) => {
    const dateInfo = eventDates.find(d => d.id === dateId);
    
    return {
      name: person.name,
      email: person.email,
      phone: person.phone || null,
      professional_title: person.professionalTitle || null,
      bio: person.bio || null,
      food_allergies: person.foodAllergies || null,
      event_date: dateInfo?.label || '',
      location: dateInfo?.location || '',
      classification: classification,
      registration_date: person.timestamp || new Date().toISOString(),
      photo_link: person.picture || null
    };
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const publications = [
    { name: 'National Catholic Reporter', lean: 'liberal' },
    { name: 'America Magazine', lean: 'liberal' },
    { name: 'Commonweal', lean: 'liberal' },
    { name: 'The Pillar', lean: 'moderate' },
    { name: 'Catholic News Agency (CNA)', lean: 'conservative' },
    { name: 'EWTN News', lean: 'conservative' },
    { name: 'National Catholic Register', lean: 'conservative' },
    { name: 'First Things', lean: 'conservative' },
    { name: 'Crisis Magazine', lean: 'conservative' }
  ];

  const eventDates = [
    { id: 'date1', label: 'March 19, 2026', location: 'NYC' },
    { id: 'date2', label: 'May 22, 2026', location: 'NYC' },
    { id: 'date3', label: 'August 19, 2026', location: 'Orange County' },
    { id: 'date4', label: 'October 23, 2026', location: 'NYC' },
    { id: 'date5', label: 'December 8, 2026', location: 'NYC' }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadRegistrations();
    loadWaitlistData();
    loadInviteList();
    try {
      const savedWebhook = localStorage.getItem('make-webhook');
      if (savedWebhook) {
        setMakeWebhookUrl(savedWebhook);
      }
    } catch (e) {
      console.error('Error loading webhook URL:', e);
    }
  }, []);

  const loadInviteList = async () => {
    if (typeof window === 'undefined') return;
    try {
      const { data, error } = await supabase.from('invites').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const formatted = data.map(row => ({ name: row.name, email: row.email, timestamp: row.request_date || row.created_at }));
        setInviteList(formatted);
        try { localStorage.setItem('invite-list', JSON.stringify(formatted)); } catch (e) {}
      } else { setInviteList([]); }
    } catch (error) {
      console.error('Error loading invite list:', error);
      try { const result = localStorage.getItem('invite-list'); if (result) setInviteList(JSON.parse(result)); } catch (e) {}
    }
  };

  const loadWaitlistData = async () => {
    if (typeof window === 'undefined') return;
    try {
      const { data, error } = await supabase.from('waitlist').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const formatted = data.map(row => ({
          name: row.name, email: row.email, phone: row.phone || '', professionalTitle: row.professional_title || '',
          bio: row.bio || '', foodAllergies: row.food_allergies || '', picture: row.photo_link || '',
          classification: row.classification || '',
          preferredDates: row.preferred_dates ? (typeof row.preferred_dates === 'string' ? row.preferred_dates.split(',').map(d => d.trim()) : row.preferred_dates) : [],
          timestamp: row.added_to_waitlist || row.created_at
        }));
        setWaitlistData(formatted);
        try { localStorage.setItem('waitlist', JSON.stringify(formatted)); } catch (e) {}
      } else { setWaitlistData([]); }
    } catch (error) {
      console.error('Error loading waitlist:', error);
      try { const result = localStorage.getItem('waitlist'); if (result) setWaitlistData(JSON.parse(result)); } catch (e) {}
    }
  };

  const loadRegistrations = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    
    try {
      console.log('Loading registrations from Supabase...');
      
      // Load from Supabase
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Loaded ${data.length} registrations from Supabase`);
      
      if (data && data.length > 0) {
        const formatted = convertSupabaseToAppFormat(data);
        setRegistrations(formatted);
        
        // Also save to localStorage as backup
        try {
          localStorage.setItem('salon-registrations', JSON.stringify(formatted));
        } catch (e) {
          console.warn('Could not save to localStorage:', e);
        }
      } else {
        // No data in Supabase, initialize empty structure
        const initialData = {};
        eventDates.forEach(date => {
          initialData[date.id] = { liberal: [], moderate: [], conservative: [] };
        });
        setRegistrations(initialData);
      }
    } catch (error) {
      console.error('Error loading from Supabase:', error);
      
      // Fallback to localStorage
      try {
        const result = localStorage.getItem('salon-registrations');
        if (result) {
          console.log('Loaded from localStorage fallback');
          setRegistrations(JSON.parse(result));
        } else {
          const initialData = {};
          eventDates.forEach(date => {
            initialData[date.id] = { liberal: [], moderate: [], conservative: [] };
          });
          setRegistrations(initialData);
        }
      } catch (localError) {
        console.error('localStorage fallback failed:', localError);
        const initialData = {};
        eventDates.forEach(date => {
          initialData[date.id] = { liberal: [], moderate: [], conservative: [] };
        });
        setRegistrations(initialData);
      }
    }
    setLoading(false);
  };

  };

  // ============================================
  // MOVE & DELETE FUNCTIONS WITH WEBHOOK SYNC
  // ============================================

  // Move registrant to waitlist (with webhook)
  const moveRegistrantToWaitlist = async (person) => {
    try {
      const waitlistEntry = {
        name: person.name,
        email: person.email,
        phone: person.phone,
        professionalTitle: person.professionalTitle,
        bio: person.bio,
        foodAllergies: person.foodAllergies,
        picture: person.picture,
        classification: person.group,
        preferredDates: [person.dateId],
        timestamp: new Date().toISOString(),
        movedFromRegistration: true,
        originalDate: person.date,
        originalLocation: person.location
      };

      const updatedWaitlist = [...waitlistData, waitlistEntry];
      
      const updatedRegistrations = { ...registrations };
      const dateRegs = updatedRegistrations[person.dateId][person.group];
      const index = dateRegs.findIndex(p => p.email === person.email && p.timestamp === person.timestamp);
      
      if (index !== -1) {
        updatedRegistrations[person.dateId][person.group].splice(index, 1);
        
        localStorage.setItem('waitlist', JSON.stringify(updatedWaitlist));
        localStorage.setItem('salon-registrations', JSON.stringify(updatedRegistrations));
        
        setWaitlistData(updatedWaitlist);
        setRegistrations(updatedRegistrations);
        setShowRemoveOptions(null);

        // Send webhook to delete from Registrations and add to Waitlist
        if (makeWebhookUrl) {
          try {
            await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'registrants',
                action: 'move_to_waitlist',
                data: [{
                  ...waitlistEntry,
                  originalDateId: person.dateId,
                  originalGroup: person.group
                }],
                exportDate: new Date().toISOString(),
                totalCount: 1
              })
            });
          } catch (error) {
            console.error('Make.com webhook error:', error);
          }
        }

        setShowAlert({ message: `${person.name} moved to waitlist successfully!`, type: 'success' });
      } else {
        setShowAlert({ message: 'Error: Could not find registrant', type: 'error' });
      }
    } catch (error) {
      console.error('Error moving to waitlist:', error);
      setShowAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Move registrant to invite list (with webhook)
  const moveRegistrantToInviteList = async (person) => {
    try {
      const inviteEntry = {
        name: person.name,
        email: person.email,
        timestamp: new Date().toISOString(),
        movedFromRegistration: true,
        originalDate: person.date,
        originalLocation: person.location
      };

      let currentInviteList = [];
      try {
        const stored = localStorage.getItem('invite-list');
        if (stored) {
          currentInviteList = JSON.parse(stored);
        }
      } catch (e) {
        currentInviteList = [];
      }
      
      const updatedInviteList = [...currentInviteList, inviteEntry];
      
      const updatedRegistrations = { ...registrations };
      const dateRegs = updatedRegistrations[person.dateId][person.group];
      const index = dateRegs.findIndex(p => p.email === person.email && p.timestamp === person.timestamp);
      
      if (index !== -1) {
        updatedRegistrations[person.dateId][person.group].splice(index, 1);
        
        localStorage.setItem('invite-list', JSON.stringify(updatedInviteList));
        localStorage.setItem('salon-registrations', JSON.stringify(updatedRegistrations));
        
        setInviteList(updatedInviteList);
        setRegistrations(updatedRegistrations);
        setShowRemoveOptions(null);

        // Send webhook to delete from Registrations and add to Invites
        if (makeWebhookUrl) {
          try {
            await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'registrants',
                action: 'move_to_invite',
                data: [{
                  ...inviteEntry,
                  originalDateId: person.dateId,
                  originalGroup: person.group
                }],
                exportDate: new Date().toISOString(),
                totalCount: 1
              })
            });
          } catch (error) {
            console.error('Make.com webhook error:', error);
          }
        }

        setShowAlert({ message: `${person.name} moved to next year's invite list!`, type: 'success' });
      } else {
        setShowAlert({ message: 'Error: Could not find registrant', type: 'error' });
      }
    } catch (error) {
      console.error('Error moving to invite list:', error);
      setShowAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Delete registrant permanently (with webhook)
  const deleteRegistrantPermanently = async (person) => {
    try {
      const updatedRegistrations = { ...registrations };
      const dateRegs = updatedRegistrations[person.dateId][person.group];
      const index = dateRegs.findIndex(p => p.email === person.email && p.timestamp === person.timestamp);
      
      if (index !== -1) {
        updatedRegistrations[person.dateId][person.group].splice(index, 1);
        localStorage.setItem('salon-registrations', JSON.stringify(updatedRegistrations));
        setRegistrations(updatedRegistrations);
        setShowRemoveOptions(null);

        // Send webhook to delete from Registrations
        if (makeWebhookUrl) {
          try {
            await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'registrants',
                action: 'delete',
                data: [{
                  email: person.email,
                  name: person.name,
                  dateId: person.dateId,
                  date: person.date,
                  group: person.group
                }],
                exportDate: new Date().toISOString(),
                totalCount: 1
              })
            });
          } catch (error) {
            console.error('Make.com webhook error:', error);
          }
        }

        setShowAlert({ message: `${person.name} has been permanently deleted.`, type: 'success' });
      } else {
        setShowAlert({ message: 'Error: Could not find registrant', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting registrant:', error);
      setShowAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Move from waitlist to registration (with webhook)
  const moveFromWaitlistToRegistration = async (waitlistIndex, dateId, group) => {
    const person = waitlistData[waitlistIndex];
    
    const updatedRegistrations = { ...registrations };
    const newRegistrant = {
      name: person.name,
      email: person.email,
      phone: person.phone,
      professionalTitle: person.professionalTitle,
      bio: person.bio,
      foodAllergies: person.foodAllergies,
      picture: person.picture,
      timestamp: new Date().toISOString(),
      movedFromWaitlist: true
    };
    
    updatedRegistrations[dateId][group].push(newRegistrant);
    
    const updatedWaitlist = [...waitlistData];
    updatedWaitlist.splice(waitlistIndex, 1);
    
    try {
      const regString = JSON.stringify(updatedRegistrations);
      const regSizeKB = new Blob([regString]).size / 1024;
      console.log(`Registration data size after move: ${regSizeKB.toFixed(2)} KB`);
      
      if (regSizeKB > 4500) {
        console.warn('Data size exceeds limit after moving, removing picture');
        const lastAdded = updatedRegistrations[dateId][group][updatedRegistrations[dateId][group].length - 1];
        lastAdded.picture = null;
        lastAdded.pictureNote = 'Picture removed due to storage limit';
      }
      
      localStorage.setItem('salon-registrations', JSON.stringify(updatedRegistrations));
      localStorage.setItem('waitlist', JSON.stringify(updatedWaitlist));
      
      setRegistrations(updatedRegistrations);
      setWaitlistData(updatedWaitlist);
      setMovingFromWaitlist(null);

      // Send webhook to delete from Waitlist and add to Registrations
      if (makeWebhookUrl) {
        try {
          const dateInfo = eventDates.find(d => d.id === dateId);
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'waitlist',
              action: 'move_to_registrant',
              data: [{
                ...newRegistrant,
                dateId: dateId,
                date: dateInfo?.label,
                location: dateInfo?.location,
                group: group,
                originalEmail: person.email
              }],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
        } catch (error) {
          console.error('Make.com webhook error:', error);
        }
      }

      setShowAlert({ message: `${person.name} moved to registration successfully!`, type: 'success' });
    } catch (error) {
      console.error('Error moving from waitlist:', error);
      setShowAlert({ message: `Error moving person: ${error.message}`, type: 'error' });
    }
  };

  // Delete from waitlist (with webhook)
  const deleteFromWaitlist = async (index) => {
    const person = waitlistData[index];
    const updated = [...waitlistData];
    updated.splice(index, 1);
    
    try {
      localStorage.setItem('waitlist', JSON.stringify(updated));
      setWaitlistData(updated);
      setShowDeleteConfirm(null);
      setShowWaitlistRemoveOptions(null);

      // Send webhook to delete from Waitlist
      if (makeWebhookUrl) {
        try {
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'waitlist',
              action: 'delete',
              data: [{
                email: person.email,
                name: person.name
              }],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
        } catch (error) {
          console.error('Make.com webhook error:', error);
        }
      }

      setShowAlert({ message: 'Removed from waitlist successfully!', type: 'success' });
    } catch (e) {
      console.error('Error saving waitlist:', e);
      setShowAlert({ message: `Error: ${e.message}`, type: 'error' });
    }
  };

  // Move waitlist person to invite list (with webhook)
  const moveWaitlistToInviteList = async (index) => {
    const person = waitlistData[index];
    
    try {
      const inviteEntry = {
        name: person.name,
        email: person.email,
        timestamp: new Date().toISOString(),
        movedFromWaitlist: true
      };

      let currentInviteList = [];
      try {
        const stored = localStorage.getItem('invite-list');
        if (stored) {
          currentInviteList = JSON.parse(stored);
        }
      } catch (e) {
        currentInviteList = [];
      }
      
      const updatedInviteList = [...currentInviteList, inviteEntry];
      const updatedWaitlist = [...waitlistData];
      updatedWaitlist.splice(index, 1);
      
      localStorage.setItem('invite-list', JSON.stringify(updatedInviteList));
      localStorage.setItem('waitlist', JSON.stringify(updatedWaitlist));
      
      setInviteList(updatedInviteList);
      setWaitlistData(updatedWaitlist);
      setShowWaitlistRemoveOptions(null);

      // Send webhook to delete from Waitlist and add to Invites
      if (makeWebhookUrl) {
        try {
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'waitlist',
              action: 'move_to_invite',
              data: [{
                ...inviteEntry,
                originalEmail: person.email
              }],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
        } catch (error) {
          console.error('Make.com webhook error:', error);
        }
      }

      setShowAlert({ message: `${person.name} moved to next year's invite list!`, type: 'success' });
    } catch (error) {
      console.error('Error moving to invite list:', error);
      setShowAlert({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Legacy function - now opens options modal
  const deleteRegistrant = async (dateId, group, index) => {
    console.log('deleteRegistrant called - opening options modal');
    const person = registrations[dateId][group][index];
    if (person) {
      setShowRemoveOptions({
        ...person,
        dateId,
        group,
        date: eventDates.find(d => d.id === dateId)?.label,
        location: eventDates.find(d => d.id === dateId)?.location
      });
    }
    setShowDeleteConfirm(null);
  };

  // ============================================
  // FORM HANDLING & HELPER FUNCTIONS
  // ============================================

  const handlePublicationToggle = (pubName) => {
    setFormData(prev => ({
      ...prev,
      publications: prev.publications.includes(pubName)
        ? prev.publications.filter(p => p !== pubName)
        : [...prev.publications, pubName]
    }));
  };

  const handlePictureUpload = (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);
    if (file) {
      console.log('File size:', file.size, 'bytes (', (file.size / 1024).toFixed(1), 'KB)');
      if (file.size > 10000000) {
        setShowAlert({ message: 'Image must be less than 10MB', type: 'error' });
        return;
      }
      
      const reader = new FileReader();
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setShowAlert({ message: 'Error reading file. Please try again.', type: 'error' });
      };
      reader.onloadend = () => {
        console.log('File read complete');
        const img = new Image();
        img.onerror = (error) => {
          console.error('Image load error:', error);
          setShowAlert({ message: 'Error loading image. Please try a different file.', type: 'error' });
        };
        img.onload = () => {
          console.log('Image loaded, original dimensions:', img.width, 'x', img.height);
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            const maxSize = 1200; // Increased for better quality
            
            if (width > height) {
              if (width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            console.log('Resizing to:', width, 'x', height);
            
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92) // Higher quality;
            
            console.log(`Image compressed: Original ${(file.size / 1024).toFixed(1)}KB -> Compressed ${(compressedDataUrl.length * 0.75 / 1024).toFixed(1)}KB`);
            
            setFormData(prev => ({
              ...prev,
              picture: compressedDataUrl,
              picturePreview: compressedDataUrl
            }));
            console.log('Image set successfully');
          } catch (error) {
            console.error('Canvas/compression error:', error);
            setShowAlert({ message: 'Error processing image. Please try again.', type: 'error' });
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const wordCount = formData.bio.trim().split(/\s+/).filter(word => word.length > 0).length;

  const classifyUser = () => {
    const counts = { liberal: 0, moderate: 0, conservative: 0 };
    formData.publications.forEach(pubName => {
      const pub = publications.find(p => p.name === pubName);
      if (pub) counts[pub.lean]++;
    });
    const max = Math.max(counts.liberal, counts.moderate, counts.conservative);
    if (counts.liberal === max && counts.liberal > counts.moderate && counts.liberal > counts.conservative) {
      return 'liberal';
    } else if (counts.conservative === max && counts.conservative > counts.moderate && counts.conservative > counts.liberal) {
      return 'conservative';
    }
    return 'moderate';
  };

  const getAvailableDates = (userClassification) => {
    const available = [];
    eventDates.forEach(date => {
      const dateRegs = registrations[date.id];
      const totalAttendees = dateRegs.liberal.length + dateRegs.moderate.length + dateRegs.conservative.length;
      const userGroupCount = dateRegs[userClassification].length;
      if (totalAttendees < 14) {
        const maxPerGroup = Math.ceil(14 / 3);
        if (userGroupCount < maxPerGroup) {
          available.push({
            ...date,
            counts: {
              liberal: dateRegs.liberal.length,
              moderate: dateRegs.moderate.length,
              conservative: dateRegs.conservative.length,
              total: totalAttendees
            }
          });
        }
      }
    });
    return available;
  };

  const handleSubmitForm = () => {
    if (!formData.name || !formData.email || !formData.bio || !formData.picture) {
      setShowAlert({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }
    if (wordCount > 250) {
      setShowAlert({ message: 'Bio must be 250 words or less', type: 'error' });
      return;
    }
    if (formData.publications.length === 0) {
      setShowAlert({ message: 'Please select at least one publication', type: 'error' });
      return;
    }
    const userClass = classifyUser();
    setClassification(userClass);
    const available = getAvailableDates(userClass);
    setAvailableDates(available);
    setStep('dates');
  };

  // Go back to form WITHOUT clearing data (for Back button on date selection)
  const goBackToForm = () => {
    setStep('form');
    setSelectedDate('');
    setIsWaitlist(false);
    setPreferredDates([]);
  };

  // Full reset - clears all form data (for "Register Another Person" or "Start Over")
  const handleReset = () => {
    setStep('form');
    setFormData({ 
      name: '', email: '', phone: '', professionalTitle: '', bio: '', 
      foodAllergies: '', picture: null, picturePreview: null, publications: [] 
    });
    setClassification('');
    setAvailableDates([]);
    setSelectedDate('');
    setIsWaitlist(false);
    setPreferredDates([]);
  };

  const getAllRegistrants = () => {
    const allRegistrants = [];
    eventDates.forEach(date => {
      const dateRegs = registrations[date.id];
      ['liberal', 'moderate', 'conservative'].forEach(group => {
        dateRegs[group].forEach(person => {
          allRegistrants.push({
            ...person,
            date: date.label,
            location: date.location,
            dateId: date.id,
            group: group
          });
        });
      });
    });
    return allRegistrants;
  };

  const getFilteredRegistrants = () => {
    let filtered = getAllRegistrants();
    if (selectedDateFilter !== 'all') {
      filtered = filtered.filter(r => r.dateId === selectedDateFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.professionalTitle && r.professionalTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filtered;
  };

  // ============================================
  // REGISTRATION HANDLER (with action: "new")
  // ============================================

  const handleRegister = async () => {
    console.log('handleRegister called');
    console.log('isWaitlist:', isWaitlist);
    console.log('selectedDate:', selectedDate);
    console.log('preferredDates:', preferredDates);
    
    if (!isWaitlist && !selectedDate) {
      console.log('Error: No date selected');
      setShowAlert({ message: 'Please select a date or choose the waitlist option', type: 'error' });
      return;
    }
    
    if (isWaitlist && preferredDates.length === 0) {
      console.log('Error: No preferred dates for waitlist');
      setShowAlert({ message: 'Please select at least one preferred date for the waitlist', type: 'error' });
      return;
    }

    console.log('Processing registration...');

    if (isWaitlist) {
      console.log('Adding to waitlist');
      const waitlistEntry = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        professionalTitle: formData.professionalTitle,
        bio: formData.bio,
        foodAllergies: formData.foodAllergies,
        picture: formData.picture,
        classification: classification,
        preferredDates: preferredDates,
        timestamp: new Date().toISOString()
      };

      try {
        let waitlist = [];
        try {
          const result = localStorage.getItem('waitlist');
          if (result) {
            waitlist = JSON.parse(result);
          }
        } catch (getError) {
          console.log('Waitlist does not exist yet, creating new one');
          waitlist = [];
        }
        
        waitlist.push(waitlistEntry);
        console.log('Saving waitlist:', waitlist);
        
        const waitlistString = JSON.stringify(waitlist);
        const waitlistSizeKB = new Blob([waitlistString]).size / 1024;
        console.log(`Waitlist size: ${waitlistSizeKB.toFixed(2)} KB`);
        
        if (waitlistSizeKB > 4500) {
          console.warn('Waitlist size exceeds limit, removing picture');
          waitlist[waitlist.length - 1].picture = null;
          waitlist[waitlist.length - 1].pictureNote = 'Picture removed due to storage limit';
          const reducedWaitlistString = JSON.stringify(waitlist);
          localStorage.setItem('waitlist', reducedWaitlistString);
          setShowAlert({ message: 'Added to waitlist! Note: Picture could not be saved due to storage limits.', type: 'success' });
        } else {
          localStorage.setItem('waitlist', waitlistString);
        }
        
        setWaitlistData(waitlist);
        
        // Send to webhook with action: "new"
        if (makeWebhookUrl) {
          try {
            await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'waitlist',
                action: 'new',
                data: [waitlistEntry],
                exportDate: new Date().toISOString(),
                totalCount: 1
              })
            });
          } catch (error) {
            console.error('Make.com webhook error:', error);
          }
        }
        
        console.log('Waitlist registration successful');
        setStep('confirmation');
      } catch (error) {
        console.error('Waitlist error:', error);
        console.error('Error details:', error.message, error.stack);
        setShowAlert({ message: `Error saving to waitlist: ${error.message}. Please try again.`, type: 'error' });
      }
    } else {
      console.log('Adding to regular registration for date:', selectedDate);
      try {
        const updatedRegistrations = { ...registrations };
        
        const registrationEntry = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          professionalTitle: formData.professionalTitle,
          bio: formData.bio,
          foodAllergies: formData.foodAllergies,
          picture: formData.picture,
          timestamp: new Date().toISOString()
        };
        
        updatedRegistrations[selectedDate][classification].push(registrationEntry);
        
        const dataString = JSON.stringify(updatedRegistrations);
        const dataSizeKB = new Blob([dataString]).size / 1024;
        console.log(`Data size: ${dataSizeKB.toFixed(2)} KB`);
        
        if (dataSizeKB > 4500) {
          console.warn('Data size exceeds limit, removing picture from this registration');
          const lastRegistrant = updatedRegistrations[selectedDate][classification][updatedRegistrations[selectedDate][classification].length - 1];
          lastRegistrant.picture = null;
          lastRegistrant.pictureNote = 'Picture removed due to storage limit';
          const reducedDataString = JSON.stringify(updatedRegistrations);
          localStorage.setItem('salon-registrations', reducedDataString);
          setShowAlert({ message: 'Registration successful! Note: Picture could not be saved due to storage limits.', type: 'success' });
        } else {
          localStorage.setItem('salon-registrations', dataString);
        }
        
        setRegistrations(updatedRegistrations);
        console.log('Regular registration successful');
        
        // Send to webhook with action: "new"
        if (makeWebhookUrl) {
          try {
            const date = eventDates.find(d => d.id === selectedDate);
            const registrantData = {
              ...registrationEntry,
              date: date?.label,
              location: date?.location,
              dateId: selectedDate,
              group: classification
            };
            await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'registrants',
                action: 'new',
                data: [registrantData],
                exportDate: new Date().toISOString(),
                totalCount: 1
              })
            });
          } catch (error) {
            console.error('Make.com webhook error:', error);
          }
        }
        
        setStep('confirmation');
      } catch (error) {
        console.error('Registration error:', error);
        console.error('Error details:', error.message, error.stack);
        setShowAlert({ message: `Error completing registration: ${error.message}. Please try again.`, type: 'error' });
      }
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportToCSV = () => {
    const registrants = getAllRegistrants();
    const headers = ['Name', 'Email', 'Phone', 'Professional Title', 'Bio', 'Food Allergies', 'Date', 'Location', 'Group'];
    const csvContent = [
      headers.join(','),
      ...registrants.map(r => [
        `"${r.name}"`,
        `"${r.email}"`,
        `"${r.phone || ''}"`,
        `"${r.professionalTitle || ''}"`,
        `"${r.bio.replace(/"/g, '""')}"`,
        `"${r.foodAllergies || ''}"`,
        `"${r.date}"`,
        `"${r.location}"`,
        `"${r.group}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salon-dinners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(registrations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salon-dinners-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportWaitlistToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Professional Title', 'Bio', 'Food Allergies', 'Classification', 'Preferred Dates', 'Date Added'];
    const csvContent = [
      headers.join(','),
      ...waitlistData.map(person => {
        const preferredDatesStr = person.preferredDates ? 
          person.preferredDates.map(dateId => {
            const date = eventDates.find(d => d.id === dateId);
            return date ? date.label : dateId;
          }).join('; ') : '';
        
        return [
          `"${person.name}"`,
          `"${person.email}"`,
          `"${person.phone || ''}"`,
          `"${person.professionalTitle || ''}"`,
          `"${person.bio ? person.bio.replace(/"/g, '""') : ''}"`,
          `"${person.foodAllergies || ''}"`,
          `"${person.classification || ''}"`,
          `"${preferredDatesStr}"`,
          `"${person.timestamp ? new Date(person.timestamp).toLocaleDateString() : ''}"`
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salon-dinners-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const sendToMake = async () => {
    if (!makeWebhookUrl) {
      setShowAlert({ message: 'Please enter your Make.com webhook URL first', type: 'error' });
      return;
    }
    try {
      const allData = getAllRegistrants();
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'registrants',
          action: 'bulk_export',
          data: allData,
          exportDate: new Date().toISOString(),
          totalCount: allData.length
        })
      });
      if (response.ok) {
        setShowAlert({ message: 'Successfully sent registrants to Make.com! Check your Google Sheet.', type: 'success' });
      } else {
        setShowAlert({ message: 'Error sending to Make.com. Please check your webhook URL.', type: 'error' });
      }
    } catch (error) {
      setShowAlert({ message: 'Error: ' + error.message, type: 'error' });
    }
  };

  const sendWaitlistToMake = async () => {
    if (!makeWebhookUrl) {
      setShowAlert({ message: 'Please enter your Make.com webhook URL first', type: 'error' });
      return;
    }
    try {
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'waitlist',
          action: 'bulk_export',
          data: waitlistData,
          exportDate: new Date().toISOString(),
          totalCount: waitlistData.length
        })
      });
      if (response.ok) {
        setShowAlert({ message: 'Successfully sent waitlist to Make.com! Check your Google Sheet.', type: 'success' });
      } else {
        setShowAlert({ message: 'Error sending waitlist to Make.com. Please check your webhook URL.', type: 'error' });
      }
    } catch (error) {
      setShowAlert({ message: 'Error: ' + error.message, type: 'error' });
    }
  };

  // ============================================
  // EDIT FUNCTIONS & ADMIN HANDLERS
  // ============================================

  const startEditRegistrant = (person) => {
    console.log('Starting edit for:', person);
    setEditingRegistrant({
      original: { ...person },
      edited: { ...person }
    });
  };

  const cancelEdit = () => {
    console.log('Canceling edit');
    setEditingRegistrant(null);
  };

  const handleEditChange = (field, value) => {
    setEditingRegistrant(prev => ({
      ...prev,
      edited: {
        ...prev.edited,
        [field]: value
      }
    }));
  };

  const handleEditPictureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10000000) {
        setShowAlert({ message: 'Image must be less than 10MB', type: 'error' });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          const maxSize = 1200; // Increased for better quality
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92) // Higher quality;
          
          console.log(`Edit image compressed: ${(compressedDataUrl.length * 0.75 / 1024).toFixed(1)}KB`);
          
          handleEditChange('picture', compressedDataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveEditedRegistrant = async () => {
    console.log('Saving edited registrant');
    const { original, edited } = editingRegistrant;
    
    if (!edited.name || !edited.email || !edited.bio) {
      setShowAlert({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    const updatedRegistrations = { ...registrations };
    
    const dateRegs = updatedRegistrations[original.dateId][original.group];
    const originalIndex = dateRegs.findIndex(p => 
      p.email === original.email && p.timestamp === original.timestamp
    );
    
    console.log('Found original at index:', originalIndex);
    
    if (originalIndex !== -1) {
      updatedRegistrations[original.dateId][original.group].splice(originalIndex, 1);
      
      const updatedRegistrant = {
        name: edited.name,
        email: edited.email,
        phone: edited.phone,
        professionalTitle: edited.professionalTitle,
        bio: edited.bio,
        foodAllergies: edited.foodAllergies,
        picture: edited.picture,
        timestamp: original.timestamp
      };
      
      updatedRegistrations[edited.dateId][edited.group].push(updatedRegistrant);
      
      try {
        localStorage.setItem('salon-registrations', JSON.stringify(updatedRegistrations));
      } catch (e) {
        console.error('Error saving registrations:', e);
      }
      setRegistrations(updatedRegistrations);
      setEditingRegistrant(null);
      
      // Send webhook to update Google Sheets
      if (makeWebhookUrl) {
        try {
          const dateInfo = eventDates.find(d => d.id === edited.dateId);
          
          // First, delete the old entry
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'registrants',
              action: 'delete',
              data: [{
                email: original.email,
                name: original.name,
                dateId: original.dateId,
                date: eventDates.find(d => d.id === original.dateId)?.label,
                group: original.group
              }],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
          
          // Then, add the updated entry
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'registrants',
              action: 'new',
              data: [{
                ...updatedRegistrant,
                date: dateInfo?.label,
                location: dateInfo?.location,
                dateId: edited.dateId,
                group: edited.group
              }],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
          
          console.log('Webhook called to update Google Sheets');
        } catch (error) {
          console.error('Webhook error:', error);
        }
      }
      
      setShowAlert({ message: 'Registration updated successfully!', type: 'success' });
    } else {
      console.error('Could not find original registrant');
      setShowAlert({ message: 'Error: Could not find registrant to update', type: 'error' });
    }
  };


  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setCurrentPage('admin');
      setAdminPassword('');
      setShowAdminLogin(false);
      setShowAlert(null);
    } else {
      setShowAlert({ message: 'Incorrect password', type: 'error' });
      setAdminPassword('');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setCurrentPage('public');
    setStep('landing');
  };

  const handleInviteSubmit = async () => {
    if (!inviteFormData.name || !inviteFormData.email) {
      setShowAlert({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    
    const inviteData = {
      name: inviteFormData.name,
      email: inviteFormData.email,
      timestamp: new Date().toISOString()
    };
    
    try {
      let inviteListData = [];
      try {
        const result = localStorage.getItem('invite-list');
        if (result) {
          inviteListData = JSON.parse(result);
        }
      } catch (e) {
        inviteListData = [];
      }
      
      inviteListData.push(inviteData);
      localStorage.setItem('invite-list', JSON.stringify(inviteListData));
      setInviteList(inviteListData);
      
      // Send to webhook with action: "new"
      if (makeWebhookUrl) {
        try {
          await fetch(makeWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'invite',
              action: 'new',
              data: [inviteData],
              exportDate: new Date().toISOString(),
              totalCount: 1
            })
          });
        } catch (error) {
          console.error('Make.com webhook error:', error);
        }
      }
      
      setShowAlert({ message: 'Thank you! We will send you an invite for next year.', type: 'success' });
      setInviteFormData({ name: '', email: '' });
      setStep('landing');
    } catch (error) {
      setShowAlert({ message: 'Error saving your information. Please try again.', type: 'error' });
    }
  };

  // ============================================
  // MODAL COMPONENTS
  // ============================================

  // Edit Modal Component
  const EditModal = () => {
    if (!editingRegistrant) return null;

    const { edited } = editingRegistrant;
    const editWordCount = edited.bio.trim().split(/\s+/).filter(word => word.length > 0).length;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Edit Registration</h2>
            <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={edited.name}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={edited.email}
                  onChange={(e) => handleEditChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={edited.phone || ''}
                  onChange={(e) => handleEditChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                <input
                  type="text"
                  value={edited.professionalTitle || ''}
                  onChange={(e) => handleEditChange('professionalTitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Picture {edited.picture && <span className="text-green-600">(Uploaded)</span>}
              </label>
              {edited.picture && (
                <div className="mb-2">
                  <img src={edited.picture} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleEditPictureUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (250 words max) <span className="text-red-600">*</span>
              </label>
              <textarea
                value={edited.bio}
                onChange={(e) => handleEditChange('bio', e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className={`text-sm mt-1 ${editWordCount > 250 ? 'text-red-600' : 'text-gray-500'}`}>
                {editWordCount}/250 words
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Food Allergies</label>
              <input
                type="text"
                value={edited.foodAllergies || ''}
                onChange={(e) => handleEditChange('foodAllergies', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
                <select
                  value={edited.dateId}
                  onChange={(e) => handleEditChange('dateId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {eventDates.map(date => (
                    <option key={date.id} value={date.id}>
                      {date.label} - {date.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classification</label>
                <select
                  value={edited.group}
                  onChange={(e) => handleEditChange('group', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="liberal">Liberal</option>
                  <option value="moderate">Moderate</option>
                  <option value="conservative">Conservative</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex space-x-3 border-t border-gray-200">
            <button
              onClick={cancelEdit}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEditedRegistrant}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Remove Options Modal for Registrants
  const RemoveOptionsModal = () => {
    if (!showRemoveOptions) return null;

    const person = showRemoveOptions;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Remove Registration</h3>
          <p className="text-gray-600 mb-6">
            What would you like to do with <strong>{person.name}</strong>'s registration for {person.date}?
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => moveRegistrantToWaitlist(person)}
              className="w-full flex items-center p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:border-orange-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">Move to Waitlist</div>
                <div className="text-sm text-gray-600">Keep them for future openings this year</div>
              </div>
            </button>

            <button 
              onClick={() => moveRegistrantToInviteList(person)}
              className="w-full flex items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">Move to Invite List</div>
                <div className="text-sm text-gray-600">Add to next year's invitation list</div>
              </div>
            </button>

            <button 
              onClick={() => deleteRegistrantPermanently(person)}
              className="w-full flex items-center p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:border-red-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-red-700">Delete Permanently</div>
                <div className="text-sm text-red-600">Remove completely (cannot be undone)</div>
              </div>
            </button>
          </div>

          <button 
            onClick={() => setShowRemoveOptions(null)}
            className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Remove Options Modal for Waitlist
  const WaitlistRemoveOptionsModal = () => {
    if (!showWaitlistRemoveOptions) return null;

    const { person, index } = showWaitlistRemoveOptions;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Remove from Waitlist</h3>
          <p className="text-gray-600 mb-6">
            What would you like to do with <strong>{person.name}</strong>?
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                setShowWaitlistRemoveOptions(null);
                setMovingFromWaitlist({ person, index });
              }}
              className="w-full flex items-center p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:border-green-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">Move to Registration</div>
                <div className="text-sm text-gray-600">Confirm their spot at an event</div>
              </div>
            </button>

            <button 
              onClick={() => moveWaitlistToInviteList(index)}
              className="w-full flex items-center p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-800">Move to Invite List</div>
                <div className="text-sm text-gray-600">Add to next year's invitation list</div>
              </div>
            </button>

            <button 
              onClick={() => deleteFromWaitlist(index)}
              className="w-full flex items-center p-4 border-2 border-red-200 bg-red-50 rounded-lg hover:border-red-400 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-red-700">Delete Permanently</div>
                <div className="text-sm text-red-600">Remove completely (cannot be undone)</div>
              </div>
            </button>
          </div>

          <button 
            onClick={() => setShowWaitlistRemoveOptions(null)}
            className="w-full mt-4 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // LOADING & ADMIN LOGIN SCREENS
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#540006' }}>
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  if (showAdminLogin) {
    return (
      <div className="min-h-screen py-12 px-4" style={{ background: '#540006' }}>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block">
              <img 
                src="/logo.png" 
                alt="Napa Institute Logo" 
                className="h-36 mx-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden">
                <p className="text-gray-400 text-sm">Logo</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword('');
                    setShowAlert(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // ADMIN DASHBOARD
  // ============================================

  if (currentPage === 'admin' && isAdminAuthenticated) {
    return (
      <div className="min-h-screen py-12 px-4" style={{ background: '#540006' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block">
              <img 
                src="/logo.png" 
                alt="Napa Institute Logo" 
                className="h-36 mx-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden">
                <p className="text-gray-400 text-sm">Logo</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h3 className="text-2xl font-bold text-gray-800">Admin Dashboard</h3>
              <div className="flex space-x-2 flex-wrap gap-2">
                <button
                  onClick={() => setAdminView('overview')}
                  className={`px-4 py-2 rounded-lg font-medium ${adminView === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setAdminView('details')}
                  className={`px-4 py-2 rounded-lg font-medium ${adminView === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Registrants
                </button>
                <button
                  onClick={() => setAdminView('waitlist')}
                  className={`px-4 py-2 rounded-lg font-medium ${adminView === 'waitlist' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Waitlist
                </button>
                <button
                  onClick={() => setAdminView('export')}
                  className={`px-4 py-2 rounded-lg font-medium ${adminView === 'export' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Export
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('public');
                    setStep('landing');
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>

            {adminView === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{getAllRegistrants().length}</div>
                    <div className="text-sm text-gray-600">Total Registrants</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {eventDates.filter(d => {
                        const regs = registrations[d.id];
                        return (regs.liberal.length + regs.moderate.length + regs.conservative.length) > 0;
                      }).length}
                    </div>
                    <div className="text-sm text-gray-600">Active Dates</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">
                      {eventDates.filter(d => {
                        const regs = registrations[d.id];
                        return (regs.liberal.length + regs.moderate.length + regs.conservative.length) >= 12;
                      }).length}
                    </div>
                    <div className="text-sm text-gray-600">Near Capacity</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">{waitlistData.length}</div>
                    <div className="text-sm text-gray-600">Waitlist</div>
                  </div>
                </div>

                {eventDates.map(date => {
                  const dateRegs = registrations[date.id] || { liberal: [], moderate: [], conservative: [] };
                  const total = dateRegs.liberal.length + dateRegs.moderate.length + dateRegs.conservative.length;
                  return (
                    <div key={date.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-semibold text-gray-800">{date.label}</span>
                          <span className="text-sm text-gray-500 ml-2">({date.location})</span>
                        </div>
                        <span className="text-sm text-gray-600">{total}/14</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <span className="text-blue-700 font-medium">Progressive: {dateRegs.liberal.length}</span>
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <span className="text-purple-700 font-medium">Moderate: {dateRegs.moderate.length}</span>
                        </div>
                        <div className="bg-red-50 p-2 rounded text-center">
                          <span className="text-red-700 font-medium">Conservative: {dateRegs.conservative.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {adminView === 'details' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Dates</option>
                    {eventDates.map(date => (
                      <option key={date.id} value={date.id}>{date.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {getFilteredRegistrants().map((person, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        {person.picture && (
                          <img
                            src={person.picture}
                            alt={person.name}
                            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800">{person.name}</h4>
                              {person.professionalTitle && (
                                <p className="text-sm text-gray-600">{person.professionalTitle}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startEditRegistrant(person);
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowRemoveOptions(person);
                                }}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                            <div><span className="font-medium">Email:</span> {person.email}</div>
                            {person.phone && <div><span className="font-medium">Phone:</span> {person.phone}</div>}
                            <div><span className="font-medium">Date:</span> {person.date}</div>
                            <div><span className="font-medium">Location:</span> {person.location}</div>
                            <div><span className="font-medium">Group:</span> {person.group}</div>
                            {person.foodAllergies && (
                              <div className="md:col-span-2"><span className="font-medium">Dietary:</span> {person.foodAllergies}</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Bio:</span> {person.bio}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getFilteredRegistrants().length === 0 && (
                    <div className="text-center py-8 text-gray-500">No registrants found</div>
                  )}
                </div>
              </div>
            )}

            {adminView === 'export' && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-800 mb-2">CSV Export (Registrants)</h5>
                  <p className="text-sm text-gray-600 mb-3">Download confirmed registrations as CSV for Google Sheets/Excel</p>
                  <button
                    onClick={exportToCSV}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Download Registrants CSV
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-800 mb-2">CSV Export (Waitlist)</h5>
                  <p className="text-sm text-gray-600 mb-3">Download waitlist as CSV for Google Sheets/Excel</p>
                  <button
                    onClick={exportWaitlistToCSV}
                    disabled={waitlistData.length === 0}
                    className={`px-6 py-2 rounded-lg ${
                      waitlistData.length === 0
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    Download Waitlist CSV ({waitlistData.length} people)
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-800 mb-2">JSON Backup</h5>
                  <p className="text-sm text-gray-600 mb-3">Complete backup with photos</p>
                  <button
                    onClick={exportToJSON}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-800 mb-2">Make.com Webhook URL</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    All registrations, waitlist entries, and invite requests will automatically send to this webhook in real-time as they happen. Moves and deletions will also sync automatically.
                  </p>
                  <input
                    type="text"
                    placeholder="https://hook.us1.make.com/your-webhook-id"
                    value={makeWebhookUrl}
                    onChange={(e) => setMakeWebhookUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                  />
                  <button
                    onClick={() => {
                      localStorage.setItem('make-webhook', makeWebhookUrl);
                      setShowAlert({ message: 'Webhook URL saved! All new submissions will be sent automatically.', type: 'success' });
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 mb-3"
                  >
                    Save Webhook URL
                  </button>
                  <div className="bg-blue-100 rounded p-3 mb-3">
                    <p className="text-xs text-blue-800 font-medium mb-2">âœ¨ Auto-Sync Enabled:</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• New registrations → <code>type: "registrants", action: "new"</code></li>
                      <li>• New waitlist signups → <code>type: "waitlist", action: "new"</code></li>
                      <li>• Invite requests → <code>type: "invite", action: "new"</code></li>
                      <li>• Move to waitlist → <code>type: "registrants", action: "move_to_waitlist"</code></li>
                      <li>• Move to invite → <code>type: "registrants/waitlist", action: "move_to_invite"</code></li>
                      <li>• Move to registrant → <code>type: "waitlist", action: "move_to_registrant"</code></li>
                      <li>• Delete → <code>type: "registrants/waitlist", action: "delete"</code></li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    You can also manually export all data at once using the buttons below:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={sendToMake}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                    >
                      Export All Registrants ({getAllRegistrants().length})
                    </button>
                    <button
                      onClick={sendWaitlistToMake}
                      disabled={waitlistData.length === 0}
                      className={`px-6 py-2 rounded-lg ${
                        waitlistData.length === 0
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      Export All Waitlist ({waitlistData.length})
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h5 className="font-semibold text-gray-800 mb-2">Make.com Setup Guide</h5>
                  <p className="text-sm text-gray-700 mb-3">
                    Your Make.com scenario needs to handle different action types:
                  </p>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside mb-4">
                    <li>Create a <strong>Webhooks â†’ Custom webhook</strong> trigger</li>
                    <li>Add a <strong>Router</strong> module</li>
                    <li>Create routes for each action type:
                      <ul className="ml-6 mt-1 space-y-1 text-xs list-disc">
                        <li><code>action = "new"</code> â†’ Add Row to appropriate sheet</li>
                        <li><code>action = "move_to_*"</code> â†’ Search & Delete from source, Add to destination</li>
                        <li><code>action = "delete"</code> â†’ Search & Delete from sheet</li>
                      </ul>
                    </li>
                    <li>Use <strong>Google Sheets "Search Rows"</strong> to find by email</li>
                    <li>Use <strong>Google Sheets "Delete Row"</strong> to remove found rows</li>
                  </ol>
                </div>
              </div>
            )}

            {adminView === 'waitlist' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800">Waitlist</h4>
                {waitlistData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No one on the waitlist yet</div>
                ) : (
                  <div className="space-y-4">
                    {waitlistData.map((person, idx) => (
                      <div key={idx} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          {person.picture && (
                            <img
                              src={person.picture}
                              alt={person.name}
                              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-lg text-gray-800">{person.name}</h4>
                                {person.professionalTitle && (
                                  <p className="text-sm text-gray-600">{person.professionalTitle}</p>
                                )}
                              </div>
                              <button
                                onClick={() => setShowWaitlistRemoveOptions({ person, index: idx })}
                                className="text-red-600 hover:text-red-700 text-sm flex items-center"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                              <div><span className="font-medium">Email:</span> {person.email}</div>
                              {person.phone && <div><span className="font-medium">Phone:</span> {person.phone}</div>}
                              <div><span className="font-medium">Classification:</span> {person.classification}</div>
                              {person.foodAllergies && (
                                <div className="md:col-span-2"><span className="font-medium">Dietary:</span> {person.foodAllergies}</div>
                              )}
                            </div>
                            <div className="mb-2">
                              <span className="font-medium text-sm">Preferred Dates:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {person.preferredDates && person.preferredDates.map(dateId => {
                                  const date = eventDates.find(d => d.id === dateId);
                                  return date ? (
                                    <span key={dateId} className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                      {date.label}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Bio:</span> {person.bio}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Added: {new Date(person.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <EditModal />
        <RemoveOptionsModal />
        <WaitlistRemoveOptionsModal />

        {/* Alert Modal */}
        {showAlert && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 99999 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '28rem', width: '100%', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', color: showAlert.type === 'success' ? '#16a34a' : '#dc2626' }}>
                {showAlert.type === 'success' ? (
                  <CheckCircle style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }} />
                ) : (
                  <AlertCircle style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }} />
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{showAlert.type === 'success' ? 'Success' : 'Error'}</h3>
              </div>
              <p style={{ color: '#374151', marginBottom: '1.5rem' }}>{showAlert.message}</p>
              <button
                onClick={() => setShowAlert(null)}
                style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Move from Waitlist Modal */}
        {movingFromWaitlist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Move {movingFromWaitlist.person.name} to Registration
              </h3>
              <p className="text-gray-600 mb-4">Select the date and group to move this person to:</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
                {eventDates.map((date) => {
                  const dateRegs = registrations[date.id];
                  const groups = ['liberal', 'moderate', 'conservative'];
                  
                  return (
                    <div key={date.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold text-gray-800 mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {date.label} - {date.location}
                      </div>
                      <div className="grid grid-cols-3 gap-2 ml-6">
                        {groups.map(group => {
                          const count = dateRegs[group].length;
                          const isFull = count >= 5;
                          return (
                            <button
                              key={group}
                              onClick={() => moveFromWaitlistToRegistration(movingFromWaitlist.index, date.id, group)}
                              disabled={isFull}
                              className={`px-3 py-2 rounded text-sm font-medium ${
                                isFull
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {group.charAt(0).toUpperCase() + group.slice(1)}
                              <br />
                              <span className="text-xs">({count}/5)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={() => setMovingFromWaitlist(null)}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // PUBLIC VIEW
  // ============================================

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#540006' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block">
            <img 
              src="/logo.png" 
              alt="Napa Institute Logo" 
              className="h-36 mx-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="hidden">
              <p className="text-gray-400 text-sm">Logo Placeholder</p>
            </div>
          </div>
        </div>

        {step === 'landing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-gray-900 mb-4">Salon Dinners 2026</h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  An Evening of Meaningful Conversation, Fellowship & Shared Mission
                </p>
              </div>

              <div className="prose prose-lg max-w-none text-gray-700 space-y-4 mb-8">
                <p>
                  Welcome to the <strong>Salon Dinner Series</strong>, a Napa Institute initiative created to bring together people of goodwill—leaders, thinkers, and faithful stewards—to engage in thoughtful dialogue and strengthen the bonds that unite us. These gatherings are designed to inspire trust, build community, and encourage collaboration in service of the Kingdom of God.
                </p>
                
                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">A Space for Unity and Understanding</h3>
                <p>
                  Across the Christian world, mistrust and division have too often overshadowed the common values we share. The Salon Dinner Series seeks to counter this trend by fostering environments where participants can:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Recognize shared goals and aspirations</li>
                  <li>Engage in charitable, meaningful discussion</li>
                  <li>Build partnerships rooted in faith and goodwill</li>
                </ul>
                <p>
                  Supported by the Napa Institute's Board of Directors and Strategic Planning Committee, these dinners play a vital role in strengthening relationships and promoting unity among Catholic leaders.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">What to Expect</h3>
                <p>
                  Each Salon Dinner offers a warm and welcoming atmosphere in which guests are invited to reflect, connect, and collaborate. A typical evening includes:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Optional Mass</li>
                  <li>Holy Rosary</li>
                  <li>Reception and Fellowship</li>
                  <li>Dinner for an intimate group of attendees</li>
                </ul>
                <p>
                  All meal costs are provided; guests arrange their own travel and accommodations.
                </p>
                <p>
                  <strong>Spouses are welcome and encouraged to attend.</strong> Dress is business casual, or clerics/habits for religious.
                </p>

                <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Join the Conversation</h3>
                <p>
                  Participants are invited to accept or decline their dinner invitation at their earliest convenience. For any questions or additional details, please contact Justo Oppus, <a href="mailto:justo.oppus@napa-institute.org" className="text-blue-600 hover:text-blue-800 underline">justo.oppus@napa-institute.org</a>.
                </p>

                <p className="text-center text-lg font-medium text-gray-800 pt-4">
                  To help ensure this event can work for your schedule, please let us know which dates you may be available to attend.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">2026 Dinner Dates</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">New York City</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• March 19, 2026</li>
                      <li>• May 22, 2026</li>
                      <li>• October 23, 2026</li>
                      <li>• December 8, 2026</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Orange County</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• August 19, 2026</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep('form')}
                  className="bg-green-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
                >
                  RSVP Now
                </button>
                <div className="mt-4">
                  <button
                    onClick={() => setStep('invite')}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    Send Me an Invite Next Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'invite' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Get Invited Next Year</h2>
              <p className="text-gray-600 mb-6 text-center">
                Leave your information and we'll send you an invitation for the 2027 Salon Dinners.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={inviteFormData.name}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={inviteFormData.email}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setStep('landing')}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleInviteSubmit}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step !== 'landing' && step !== 'invite' && (
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-3">Salon Dinners 2026</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Join us for an intimate salon dinner featuring thoughtful conversation, inspired cuisine, and the company of leaders and innovators gathered around a shared table.
              </p>
              <div className="mt-4 inline-block bg-gray-50 border border-gray-200 rounded-lg px-6 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tentative Schedule*</p>
                <div className="grid grid-cols-4 gap-4 text-sm text-gray-700">
                  <div className="text-center">
                    <div className="font-medium">5:00 PM</div>
                    <div className="text-gray-600">Mass</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">5:40 PM</div>
                    <div className="text-gray-600">Rosary</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">6:00 PM</div>
                    <div className="text-gray-600">Reception</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">7:00 PM</div>
                    <div className="text-gray-600">Dinner</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic mt-2">*Schedule subject to change</p>
              </div>
            </div>

            {step === 'form' && (
              <div className="space-y-6">
                <button
                  onClick={() => setStep('landing')}
                  className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Home
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-600 text-lg">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-600 text-lg">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(Optional - to share with other dinner guests)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                  <input
                    type="text"
                    value={formData.professionalTitle}
                    onChange={(e) => setFormData({ ...formData, professionalTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Director of Marketing, Professor of Philosophy (Optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture <span className="text-red-600 text-lg">*</span>
                  </label>
                  <div className="mt-2">
                    {formData.picturePreview ? (
                      <div className="flex items-center space-x-4">
                        <img
                          src={formData.picturePreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        />
                        <button
                          onClick={() => setFormData({ ...formData, picture: null, picturePreview: null })}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePictureUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio (250 words maximum) <span className="text-red-600 text-lg">*</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself, your interests, and why you want to participate in this discussion..."
                  />
                  <div className={`text-sm mt-1 ${wordCount > 250 ? 'text-red-600' : 'text-gray-500'}`}>
                    {wordCount}/250 words
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Food Allergies or Dietary Restrictions</label>
                  <input
                    type="text"
                    value={formData.foodAllergies}
                    onChange={(e) => setFormData({ ...formData, foodAllergies: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Peanuts, Gluten, Vegetarian, etc. (Optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Which Catholic publications do you regularly read? (Select all that apply) <span className="text-red-600 text-lg">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publications.map((pub) => (
                      <label
                        key={pub.name}
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.publications.includes(pub.name)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.publications.includes(pub.name)}
                          onChange={() => handlePublicationToggle(pub.name)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">{pub.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmitForm();
                  }}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue to Date Selection
                </button>
              </div>
            )}

            {step === 'dates' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    Please choose a date that works best with your schedule. Dates that are full will not show up here.
                  </p>
                </div>

                {availableDates.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Available Dates</h3>
                    <p className="text-gray-600 mb-4">
                      All dates are currently full. You can join the waitlist and we'll contact you if a spot opens up.
                    </p>
                    <div className="flex space-x-3 justify-center">
                      <button
                        onClick={goBackToForm}
                        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setIsWaitlist(true);
                          setPreferredDates(eventDates.map(d => d.id));
                        }}
                        className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                      >
                        Join Waitlist
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Your Preferred Date:</h3>
                      <div className="space-y-3">
                        {availableDates.map((date) => (
                          <label
                            key={date.id}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedDate === date.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="date"
                                value={date.id}
                                checked={selectedDate === date.id}
                                onChange={(e) => {
                                  setSelectedDate(e.target.value);
                                  setIsWaitlist(false);
                                }}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                                  <span className="font-medium text-gray-800">{date.label}</span>
                                </div>
                                <div className="text-sm text-gray-600 ml-6">{date.location}</div>
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{date.counts.total}/14 registered</span>
                            </div>
                          </label>
                        ))}
                        
                        <div
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isWaitlist
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="date"
                              value="waitlist"
                              checked={isWaitlist}
                              onChange={() => {
                                setIsWaitlist(true);
                                setSelectedDate('');
                              }}
                              className="w-4 h-4 text-orange-600"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-800">
                                Date(s) not available, Put me on waitlist
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                We'll contact you if a spot opens up
                              </div>
                            </div>
                          </label>
                          
                          {isWaitlist && (
                            <div className="mt-4 pl-7">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Select your preferred date(s):
                              </p>
                              <div className="space-y-2">
                                {eventDates.map((date) => (
                                  <label key={date.id} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={preferredDates.includes(date.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setPreferredDates([...preferredDates, date.id]);
                                        } else {
                                          setPreferredDates(preferredDates.filter(d => d !== date.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                      {date.label} - {date.location}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={goBackToForm}
                        className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRegister();
                        }}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                          isWaitlist
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isWaitlist ? 'Join Waitlist' : 'Complete Registration'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 'confirmation' && (
              <div className="text-center py-8">
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {isWaitlist ? 'Added to Waitlist!' : 'Registration Confirmed!'}
                </h2>
                <p className="text-gray-600 mb-2">Thank you, {formData.name}.</p>
                
                {isWaitlist ? (
                  <>
                    <p className="text-gray-600 mb-6">
                      You've been added to the waitlist for the following date(s):
                    </p>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                      <ul className="text-sm text-orange-800 mb-3 space-y-1">
                        {preferredDates.map(dateId => {
                          const date = eventDates.find(d => d.id === dateId);
                          return date ? (
                            <li key={dateId}>• {date.label} - {date.location}</li>
                          ) : null;
                        })}
                      </ul>
                      <p className="text-sm text-orange-800 mb-2">
                        A confirmation email has been sent to <strong>{formData.email}</strong>
                      </p>
                      <p className="text-sm text-orange-800">
                        We'll contact you if a spot becomes available for any of your preferred dates.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6">
                      You're confirmed for <span className="font-semibold">{eventDates.find(d => d.id === selectedDate)?.label}</span>
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                      <p className="text-sm text-blue-800 mb-2">
                        A confirmation email has been sent to <strong>{formData.email}</strong>
                      </p>
                      <p className="text-sm text-blue-800">
                        Additional information about the dinner will be sent to your email in the coming weeks.
                      </p>
                    </div>
                  </>
                )}
                
                <button
                  onClick={handleReset}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Register Another Person
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => setShowAdminLogin(true)}
            className="text-white text-sm opacity-50 hover:opacity-75 transition-opacity"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Modals */}
      <EditModal />
      <RemoveOptionsModal />
      <WaitlistRemoveOptionsModal />

      {/* Alert Modal */}
      {showAlert && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '28rem', width: '100%', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', color: showAlert.type === 'success' ? '#16a34a' : '#dc2626' }}>
              {showAlert.type === 'success' ? (
                <CheckCircle style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }} />
              ) : (
                <AlertCircle style={{ width: '1.5rem', height: '1.5rem', marginRight: '0.5rem' }} />
              )}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{showAlert.type === 'success' ? 'Success' : 'Error'}</h3>
            </div>
            <p style={{ color: '#374151', marginBottom: '1.5rem' }}>{showAlert.message}</p>
            <button
              onClick={() => setShowAlert(null)}
              style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Move from Waitlist Modal */}
      {movingFromWaitlist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Move {movingFromWaitlist.person.name} to Registration
            </h3>
            <p className="text-gray-600 mb-4">Select the date and group to move this person to:</p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {eventDates.map((date) => {
                const dateRegs = registrations[date.id];
                const groups = ['liberal', 'moderate', 'conservative'];
                
                return (
                  <div key={date.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="font-semibold text-gray-800 mb-2 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {date.label} - {date.location}
                    </div>
                    <div className="grid grid-cols-3 gap-2 ml-6">
                      {groups.map(group => {
                        const count = dateRegs[group].length;
                        const isFull = count >= 5;
                        return (
                          <button
                            key={group}
                            onClick={() => moveFromWaitlistToRegistration(movingFromWaitlist.index, date.id, group)}
                            disabled={isFull}
                            className={`px-3 py-2 rounded text-sm font-medium ${
                              isFull
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {group.charAt(0).toUpperCase() + group.slice(1)}
                            <br />
                            <span className="text-xs">({count}/5)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setMovingFromWaitlist(null)}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function HomePage() {
  return <SalonDinners />;
}
