"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/hooks/useAuth";
import { authApi } from "@/lib/api/auth";
import { Trash2, AlertTriangle, Edit2, Plus, MapPin, Check, Loader2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";

const US_STATES = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" }, { abbr: "DC", name: "District of Columbia" },
];

interface Address {
  id: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, loadUser } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    location: user?.location || "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    available: boolean | null;
    checking: boolean;
    message: string;
  }>({ available: null, checking: false, message: "" });

  // Email notification preferences
  const [emailPrefs, setEmailPrefs] = useState({
    emailOnTradeProposed: true,
    emailOnTradeCountered: true,
    emailOnTradeAccepted: true,
    emailOnTradeDeclined: true,
    emailOnTradeCancelled: true,
    emailOnTradeMessage: true,
  });
  const [isSavingEmailPrefs, setIsSavingEmailPrefs] = useState(false);
  const [emailPrefsSaved, setEmailPrefsSaved] = useState(false);

  // Address management
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    isDefault: false,
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof typeof addressForm, string>>>({});
  const line1Ref = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Load Google Places script and init autocomplete on line1 when form opens
  useEffect(() => {
    if (!showAddressForm) return;

    const initAutocomplete = () => {
      if (!line1Ref.current || !(window as any).google?.maps?.places) return;
      if (autocompleteRef.current) return; // already initialized

      const ac = new (window as any).google.maps.places.Autocomplete(line1Ref.current, {
        componentRestrictions: { country: "us" },
        fields: ["address_components"],
        types: ["address"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.address_components) return;

        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let zip = "";

        for (const component of place.address_components) {
          const type = component.types[0];
          if (type === "street_number") streetNumber = component.long_name;
          if (type === "route") route = component.short_name;
          if (type === "locality") city = component.long_name;
          if (type === "administrative_area_level_1") state = component.short_name;
          if (type === "postal_code") zip = component.long_name;
        }

        setAddressForm((prev) => ({
          ...prev,
          line1: `${streetNumber} ${route}`.trim(),
          city,
          state,
          postalCode: zip,
        }));
        setAddressErrors((prev) => ({
          ...prev,
          line1: undefined,
          city: undefined,
          state: undefined,
          postalCode: undefined,
        }));
      });

      autocompleteRef.current = ac;
    };

    if ((window as any).google?.maps?.places) {
      initAutocomplete();
    } else {
      const existingScript = document.getElementById("google-maps-places");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-maps-places";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`;
        script.async = true;
        script.onload = initAutocomplete;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", initAutocomplete);
      }
    }

    return () => {
      if (autocompleteRef.current) {
        (window as any).google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [showAddressForm]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || "",
        bio: user.bio || "",
        location: user.location || "",
      });
      setEmailPrefs({
        emailOnTradeProposed: user.emailOnTradeProposed ?? true,
        emailOnTradeCountered: user.emailOnTradeCountered ?? true,
        emailOnTradeAccepted: user.emailOnTradeAccepted ?? true,
        emailOnTradeDeclined: user.emailOnTradeDeclined ?? true,
        emailOnTradeCancelled: user.emailOnTradeCancelled ?? true,
        emailOnTradeMessage: user.emailOnTradeMessage ?? true,
      });
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const res = await api.get("/users/me/addresses");
      setAddresses(res.data.data);
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    }
  };

  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      // Skip if username hasn't changed or is empty
      if (!username || username === user?.username) {
        setUsernameAvailability({ available: null, checking: false, message: "" });
        return;
      }

      // Validate format
      if (username.length < 3 || username.length > 20) {
        setUsernameAvailability({
          available: false,
          checking: false,
          message: "Username must be 3-20 characters",
        });
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameAvailability({
          available: false,
          checking: false,
          message: "Username can only contain letters, numbers, and underscores",
        });
        return;
      }

      setUsernameAvailability({ available: null, checking: true, message: "" });

      try {
        const res = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
        const { available, reason } = res.data.data;
        setUsernameAvailability({
          available,
          checking: false,
          message: available ? "Username is available" : reason || "Username is taken",
        });
      } catch (err) {
        setUsernameAvailability({
          available: false,
          checking: false,
          message: "Error checking username",
        });
      }
    },
    [user?.username]
  );

  const handleUsernameChange = (newUsername: string) => {
    setProfileForm({ ...profileForm, username: newUsername });

    // Debounce the availability check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSaveProfile = async () => {
    // Check if username changed and is not available
    if (
      profileForm.username !== user?.username &&
      usernameAvailability.available !== true
    ) {
      setError("Please choose an available username");
      return;
    }

    setIsSavingProfile(true);
    setError("");
    try {
      await api.patch("/users/me", profileForm);
      await loadUser();
      setIsEditingProfile(false);
      setUsernameAvailability({ available: null, checking: false, message: "" });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEmailPrefs = async () => {
    setIsSavingEmailPrefs(true);
    setEmailPrefsSaved(false);
    try {
      await api.patch("/users/me", emailPrefs);
      await loadUser();
      setEmailPrefsSaved(true);
      setTimeout(() => setEmailPrefsSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save email preferences");
    } finally {
      setIsSavingEmailPrefs(false);
    }
  };

  const validateAddressForm = (): boolean => {
    const errors: Partial<Record<keyof typeof addressForm, string>> = {};

    if (!addressForm.fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (addressForm.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    if (!addressForm.line1.trim()) {
      errors.line1 = "Address is required";
    }

    if (!addressForm.city.trim()) {
      errors.city = "City is required";
    } else if (!/^[a-zA-Z\s\-'.]+$/.test(addressForm.city.trim())) {
      errors.city = "City must contain only letters";
    }

    if (!addressForm.state) {
      errors.state = "State is required";
    }

    if (!addressForm.postalCode) {
      errors.postalCode = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(addressForm.postalCode)) {
      errors.postalCode = "Enter a valid ZIP code (e.g. 12345 or 12345-6789)";
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    setIsSavingAddress(true);
    setError("");
    try {
      if (editingAddressId) {
        await api.patch(`/users/me/addresses/${editingAddressId}`, addressForm);
      } else {
        await api.post("/users/me/addresses", addressForm);
      }
      await fetchAddresses();
      setShowAddressForm(false);
      setEditingAddressId(null);
      resetAddressForm();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save address");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      await fetchAddresses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete address");
    }
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm({
      label: address.label || "",
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 || "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "US",
      isDefault: false,
    });
    setAddressErrors({});
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await authApi.deleteAccount(password);
      logout();
      router.push("/auth/login?deleted=true");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Profile</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className="w-full px-4 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameAvailability.checking && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    )}
                    {!usernameAvailability.checking && usernameAvailability.available === true && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    {!usernameAvailability.checking && usernameAvailability.available === false && (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                </div>
                {usernameAvailability.message && (
                  <p
                    className={`text-sm mt-1 ${
                      usernameAvailability.available === true
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {usernameAvailability.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  maxLength={100}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileForm({
                      username: user?.username || "",
                      bio: user?.bio || "",
                      location: user?.location || "",
                    });
                    setError("");
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Username</label>
                <p className="text-white font-medium">{user?.username}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Bio</label>
                <p className="text-white">{user?.bio || <span className="text-slate-500">No bio set</span>}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Location</label>
                <p className="text-white">{user?.location || <span className="text-slate-500">No location set</span>}</p>
              </div>
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Email Status</label>
              <p className="text-white font-medium">
                {user?.isEmailVerified ? (
                  <span className="text-green-400">✓ Verified</span>
                ) : (
                  <span className="text-yellow-400">⚠ Not Verified</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Email Notifications Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-1">Email Notifications</h2>
          <p className="text-sm text-slate-400 mb-4">Choose which trade events trigger an email notification.</p>
          <div className="space-y-3">
            {([
              { key: "emailOnTradeProposed", label: "New trade offer received" },
              { key: "emailOnTradeCountered", label: "Counter offer received" },
              { key: "emailOnTradeAccepted", label: "Trade accepted" },
              { key: "emailOnTradeDeclined", label: "Trade declined" },
              { key: "emailOnTradeCancelled", label: "Trade cancelled" },
              { key: "emailOnTradeMessage", label: "New message in a trade" },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailPrefs[key]}
                  onChange={(e) => setEmailPrefs({ ...emailPrefs, [key]: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleSaveEmailPrefs}
            disabled={isSavingEmailPrefs}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isSavingEmailPrefs ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : emailPrefsSaved ? (
              <><Check className="h-4 w-4" /> Saved</>
            ) : (
              "Save Preferences"
            )}
          </button>
        </div>

        {/* Shipping Addresses Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">Shipping Addresses</h2>
              <p className="text-sm text-slate-400 mt-1">Required for trading - cards will be shipped to our verification center</p>
            </div>
            {!showAddressForm && (
              <button
                onClick={() => {
                  resetAddressForm();
                  setShowAddressForm(true);
                  setEditingAddressId(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Address
              </button>
            )}
          </div>

          {showAddressForm && (
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 space-y-4">
              <h3 className="font-medium text-white">{editingAddressId ? "Edit Address" : "New Address"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={addressForm.label}
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    placeholder="Home, Work, etc."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) => {
                      setAddressForm({ ...addressForm, fullName: e.target.value });
                      setAddressErrors({ ...addressErrors, fullName: undefined });
                    }}
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${addressErrors.fullName ? "border-red-500" : "border-slate-700"}`}
                  />
                  {addressErrors.fullName && <p className="text-red-400 text-xs mt-1">{addressErrors.fullName}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Address Line 1 *</label>
                <input
                  ref={line1Ref}
                  type="text"
                  value={addressForm.line1}
                  onChange={(e) => {
                    setAddressForm({ ...addressForm, line1: e.target.value });
                    setAddressErrors({ ...addressErrors, line1: undefined });
                  }}
                  placeholder="Start typing your address…"
                  autoComplete="off"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${addressErrors.line1 ? "border-red-500" : "border-slate-700"}`}
                />
                {addressErrors.line1 && <p className="text-red-400 text-xs mt-1">{addressErrors.line1}</p>}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => {
                      setAddressForm({ ...addressForm, city: e.target.value });
                      setAddressErrors({ ...addressErrors, city: undefined });
                    }}
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${addressErrors.city ? "border-red-500" : "border-slate-700"}`}
                  />
                  {addressErrors.city && <p className="text-red-400 text-xs mt-1">{addressErrors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">State *</label>
                  <div className="relative">
                    <select
                      value={addressForm.state}
                      onChange={(e) => {
                        setAddressForm({ ...addressForm, state: e.target.value });
                        setAddressErrors({ ...addressErrors, state: undefined });
                      }}
                      className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 ${addressErrors.state ? "border-red-500" : "border-slate-700"}`}
                    >
                      <option value="">Select state</option>
                      {US_STATES.map(({ abbr, name }) => (
                        <option key={abbr} value={abbr}>{abbr} — {name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  {addressErrors.state && <p className="text-red-400 text-xs mt-1">{addressErrors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    maxLength={10}
                    onChange={(e) => {
                      // Allow digits and one hyphen for ZIP+4 format (e.g. 12345-6789)
                      const val = e.target.value.replace(/[^\d-]/g, "");
                      setAddressForm({ ...addressForm, postalCode: val });
                      setAddressErrors({ ...addressErrors, postalCode: undefined });
                    }}
                    placeholder="12345"
                    className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${addressErrors.postalCode ? "border-red-500" : "border-slate-700"}`}
                  />
                  {addressErrors.postalCode && <p className="text-red-400 text-xs mt-1">{addressErrors.postalCode}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-300">Set as default address</label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isSavingAddress ? "Saving..." : editingAddressId ? "Update Address" : "Add Address"}
                </button>
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddressId(null);
                    resetAddressForm();
                    setError("");
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {addresses.length === 0 && !showAddressForm ? (
            <div className="text-center py-8 text-slate-400">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No addresses saved</p>
              <p className="text-sm">Add a shipping address to start trading</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {address.label && (
                          <span className="text-sm font-medium text-blue-400">{address.label}</span>
                        )}
                        {address.isDefault && (
                          <span className="flex items-center gap-1 text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium">{address.fullName}</p>
                      <p className="text-slate-300 text-sm">{address.line1}</p>
                      {address.line2 && <p className="text-slate-300 text-sm">{address.line2}</p>}
                      <p className="text-slate-300 text-sm">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>
          </div>

          {!showDeleteConfirm ? (
            <div>
              <p className="text-slate-300 mb-4">
                Once you delete your account, there is no going back. This will permanently delete your account, collection, and all trade history.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-300 font-medium">
                Are you absolutely sure? This action cannot be undone.
              </p>
              <p className="text-sm text-slate-400">
                Please enter your password to confirm account deletion.
              </p>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPassword("");
                    setError("");
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
