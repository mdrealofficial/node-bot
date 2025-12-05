import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DHAKA_AREAS, DHAKA_SUB_AREAS, DISTRICTS_WITH_UPAZILAS, CITY_CORPORATIONS, DELIVERY_LOCATIONS } from '@/lib/bangladeshAddressData';

interface BangladeshAddressFormProps {
  value?: {
    delivery_location?: 'inside_dhaka' | 'outside_dhaka';
    city_corporation?: string;
    area?: string;
    sub_area?: string;
    district?: string;
    upazila?: string;
    street_address?: string;
  } | null;
  onChange: (value: any) => void;
  allowedAreas?: 'inside_dhaka' | 'outside_dhaka' | 'both';
  enableSubArea?: boolean;
  onSubmit?: (value: any) => void;
  showSubmitButton?: boolean;
}


export function BangladeshAddressForm({ value, onChange, allowedAreas = 'both', enableSubArea = true, onSubmit, showSubmitButton = false }: BangladeshAddressFormProps) {
  const [selectedLocation, setSelectedLocation] = useState(value?.delivery_location || '');
  const [selectedCityCorp, setSelectedCityCorp] = useState(value?.city_corporation || '');
  const [selectedArea, setSelectedArea] = useState(value?.area || '');
  const [selectedSubArea, setSelectedSubArea] = useState(value?.sub_area || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value?.district || '');
  const [selectedUpazila, setSelectedUpazila] = useState(value?.upazila || '');
  const [streetAddress, setStreetAddress] = useState(value?.street_address || '');

  const availableLocations = allowedAreas === 'both' 
    ? DELIVERY_LOCATIONS 
    : DELIVERY_LOCATIONS.filter(loc => loc.value === allowedAreas);

  // Sync form state with incoming value prop changes (for saved addresses)
  useEffect(() => {
    if (!value) return;

    if (value.delivery_location) setSelectedLocation(value.delivery_location);
    if (value.city_corporation) setSelectedCityCorp(value.city_corporation);
    if (value.area) setSelectedArea(value.area);
    if (value.sub_area) setSelectedSubArea(value.sub_area);
    if (value.district) setSelectedDistrict(value.district);
    if (value.upazila) setSelectedUpazila(value.upazila);
    if (value.street_address) setStreetAddress(value.street_address);
  }, [value]);

  useEffect(() => {
    // Only auto-call onChange if there's no submit button (real-time mode)
    if (!showSubmitButton) {
      onChange({
        delivery_location: selectedLocation,
        city_corporation: selectedCityCorp,
        area: selectedArea,
        sub_area: selectedSubArea,
        district: selectedDistrict,
        upazila: selectedUpazila,
        street_address: streetAddress,
      });
    }
  }, [selectedLocation, selectedCityCorp, selectedArea, selectedSubArea, selectedDistrict, selectedUpazila, streetAddress, showSubmitButton]);

  const handleSubmit = () => {
    const addressData = {
      delivery_location: selectedLocation,
      city_corporation: selectedCityCorp,
      area: selectedArea,
      sub_area: selectedSubArea,
      district: selectedDistrict,
      upazila: selectedUpazila,
      street_address: streetAddress,
    };
    
    if (onSubmit) {
      onSubmit(addressData);
    } else {
      onChange(addressData);
    }
  };

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location as 'inside_dhaka' | 'outside_dhaka');
    // Reset other fields
    setSelectedCityCorp('');
    setSelectedArea('');
    setSelectedDistrict('');
    setSelectedUpazila('');
  };

  const handleCityCorpChange = (corp: string) => {
    setSelectedCityCorp(corp);
    setSelectedArea('');
    setSelectedSubArea('');
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    setSelectedSubArea('');
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    setSelectedUpazila(''); // Reset upazila when district changes
  };

  const areas = selectedCityCorp === 'dhaka_north' 
    ? DHAKA_AREAS.dhaka_north 
    : selectedCityCorp === 'dhaka_south' 
    ? DHAKA_AREAS.dhaka_south 
    : [];

  const subAreas = selectedArea ? DHAKA_SUB_AREAS[selectedArea] || [] : [];
  const upazilas = selectedDistrict ? DISTRICTS_WITH_UPAZILAS[selectedDistrict] || [] : [];

  return (
    <div className="space-y-5">
      {/* Delivery Location */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Delivery Location *</Label>
        {availableLocations.length === 1 ? (
          <div className="p-4 bg-accent rounded-lg">
            <p className="font-medium">{availableLocations[0].label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This store only delivers to {availableLocations[0].label}
            </p>
          </div>
        ) : (
          <RadioGroup value={selectedLocation} onValueChange={handleLocationChange} className="grid grid-cols-2 gap-3">
            {availableLocations.map((location) => (
              <div
                key={location.value}
                onClick={() => handleLocationChange(location.value)}
                className="flex items-center space-x-2 p-4 border-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <RadioGroupItem value={location.value} id={location.value} />
                <Label htmlFor={location.value} className="flex-1 cursor-pointer font-medium">
                  {location.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Inside Dhaka Address Fields */}
      {selectedLocation === 'inside_dhaka' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="city_corp" className="text-sm font-medium">City Corporation *</Label>
            <Select value={selectedCityCorp} onValueChange={handleCityCorpChange}>
              <SelectTrigger id="city_corp" className="h-11">
                <SelectValue placeholder="Select City Corporation" />
              </SelectTrigger>
              <SelectContent>
                {CITY_CORPORATIONS.map((corp) => (
                  <SelectItem key={corp.value} value={corp.value}>
                    {corp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCityCorp && (
            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm font-medium">Area *</Label>
              <Select value={selectedArea} onValueChange={handleAreaChange}>
                <SelectTrigger id="area" className="h-11">
                  <SelectValue placeholder="Select Area" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {[...areas].sort().map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {enableSubArea && selectedArea && subAreas.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sub_area" className="text-sm font-medium">Sub-Area (Optional)</Label>
              <Select value={selectedSubArea} onValueChange={setSelectedSubArea}>
                <SelectTrigger id="sub_area" className="h-11">
                  <SelectValue placeholder="Select Sub-Area" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {[...subAreas].sort().map((subArea) => (
                    <SelectItem key={subArea} value={subArea}>
                      {subArea}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Outside Dhaka Address Fields */}
      {selectedLocation === 'outside_dhaka' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="district" className="text-sm font-medium">District (Zilla) *</Label>
            <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
              <SelectTrigger id="district" className="h-11">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.keys(DISTRICTS_WITH_UPAZILAS).sort().map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDistrict && (
            <div className="space-y-2">
              <Label htmlFor="upazila" className="text-sm font-medium">Upazila *</Label>
              <Select value={selectedUpazila} onValueChange={setSelectedUpazila}>
                <SelectTrigger id="upazila" className="h-11">
                  <SelectValue placeholder="Select Upazila" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {[...upazilas].sort().map((upazila) => (
                    <SelectItem key={upazila} value={upazila}>
                      {upazila}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Street Address - Common for both */}
      {selectedLocation && (
        <div className="space-y-2">
          <Label htmlFor="street_address" className="text-sm font-medium">Street Address *</Label>
          <Textarea
            id="street_address"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            rows={3}
            placeholder={
              selectedLocation === 'inside_dhaka'
                ? 'House/Flat number, Road number, Block'
                : 'House/Village, Road, Detailed address'
            }
            className="resize-none"
            required
          />
        </div>
      )}

      {/* Submit Button */}
      {showSubmitButton && selectedLocation && streetAddress && (
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 rounded-md font-medium transition-colors"
        >
          Save Address
        </button>
      )}
    </div>
  );
}
