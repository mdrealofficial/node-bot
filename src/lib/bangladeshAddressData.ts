// Bangladesh Address Data for Shipping Configuration

export const DHAKA_AREAS = {
  dhaka_north: [
    "Uttara (Sectors 1-18)", "Mirpur (Sections 1-14)", "Pallabi", "Kafrul", 
    "Cantonment", "Gulshan (1-2)", "Banani", "Baridhara", "Baridhara DOHS",
    "Niketan", "Nikunja (1-2)", "Khilkhet", "Dakshinkhan", "Uttarkhan",
    "Mohakhali", "Mohakhali DOHS", "Banasree", "Rampura", "Badda", "Vatara",
    "Kuril", "Tejgaon Industrial Area", "Airport", "Khilgaon", "Bashundhara",
    "Aftabnagar", "Shahjadpur", "Mohammadpur (part)", "Adabor (part)"
  ],
  dhaka_south: [
    "Motijheel", "Dhanmondi (1-32)", "Mohammadpur", "Adabor", "Shyamoli",
    "Farmgate", "Karwan Bazar", "Shahbagh", "Ramna", "Lalbagh", "Old Dhaka",
    "Hazaribagh", "Kamrangirchar", "Jatrabari", "Demra", "Kotwali", "Sutrapur",
    "Wari", "Gendaria", "New Market", "Elephant Road", "Panthapath", "Green Road",
    "Science Lab", "Asad Gate", "Kalabagan", "Kataban", "Hatirpool", "Eskaton",
    "Malibagh", "Mouchak", "Maghbazar", "Segunbagicha", "Paltan", "Purana Paltan",
    "Kakrail", "Shantinagar", "Arambagh", "Azimpur", "Nilkhet", "Bangla Motor",
    "Kawran Bazar", "Indira Road", "Zigatola", "Lalmatia", "Mohammadia Housing",
    "Ring Road", "Sadarghat", "Gulistan", "Bangshal", "Chawkbazar", "Tikatuli"
  ]
};

export const DHAKA_SUB_AREAS: Record<string, string[]> = {
  "Uttara (Sectors 1-18)": ["Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6", "Sector 7", "Sector 8", "Sector 9", "Sector 10", "Sector 11", "Sector 12", "Sector 13", "Sector 14", "Sector 15", "Sector 16", "Sector 17", "Sector 18", "Azampur", "Ranavola"],
  "Mirpur (Sections 1-14)": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5", "Section 6", "Section 7", "Section 10", "Section 11", "Section 12", "Section 13", "Section 14", "Pirerbag", "Monipur", "Rupnagar", "Shewrapara", "Kachukhet"],
  "Gulshan (1-2)": ["Gulshan 1", "Gulshan 2", "Gulshan Avenue", "Gulshan Circle 1", "Gulshan Circle 2"],
  "Banani": ["Banani DOHS", "Banani Road 1-27", "Banani Chairman Bari", "Banani Model Town"],
  "Dhanmondi (1-32)": ["Road 1", "Road 2", "Road 3", "Road 4", "Road 5", "Road 6", "Road 7", "Road 8", "Road 9", "Road 10", "Road 11", "Road 12", "Road 15", "Road 27", "Road 32", "Dhanmondi Lake"],
  "Mohammadpur": ["Geneva Camp", "PC Culture", "Town Hall", "Iqbal Road", "Japan Garden City", "Bosila"],
  "Motijheel": ["Motijheel Commercial Area", "Dilkusha", "DIT Avenue"],
};

export const DISTRICTS_WITH_UPAZILAS: Record<string, string[]> = {
  'Bagerhat': ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'].sort(),
  'Bandarban': ['Bandarban Sadar', 'Thanchi', 'Lama', 'Naikhongchhari', 'Ali Kadam', 'Rowangchhari', 'Ruma'].sort(),
  'Barguna': ['Amtali', 'Bamna', 'Barguna Sadar', 'Betagi', 'Patharghata', 'Taltali'].sort(),
  'Barisal': ['Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Barisal Sadar', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'].sort(),
  'Bhola': ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'].sort(),
  'Bogra': ['Adamdighi', 'Bogra Sadar', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'].sort(),
  'Brahmanbaria': ['Akhaura', 'Bancharampur', 'Brahmanbaria Sadar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail', 'Ashuganj', 'Bijoynagar'].sort(),
  'Chandpur': ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'].sort(),
  'Chapainawabganj': ['Bholahat', 'Gomastapur', 'Nachole', 'Nawabganj Sadar', 'Shibganj'].sort(),
  'Chattogram': ['Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda', 'Chattogram Sadar'].sort(),
  'Chuadanga': ['Alamdanga', 'Chuadanga Sadar', 'Damurhuda', 'Jibannagar'].sort(),
  'Comilla': ['Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Comilla Sadar', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Meghna', 'Muradnagar', 'Nangalkot', 'Titas'].sort(),
  "Cox's Bazar": ["Chakaria", "Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"].sort(),
  'Dhaka': ['Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar'].sort(),
  'Dinajpur': ['Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Dinajpur Sadar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'].sort(),
  'Faridpur': ['Alfadanga', 'Bhanga', 'Boalmari', 'Char Bhadrasan', 'Faridpur Sadar', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'].sort(),
  'Feni': ['Chhagalnaiya', 'Daganbhuiyan', 'Feni Sadar', 'Fulgazi', 'Parshuram', 'Sonagazi'].sort(),
  'Gaibandha': ['Fulchhari', 'Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'].sort(),
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur'].sort(),
  'Gopalganj': ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'].sort(),
  'Habiganj': ['Ajmiriganj', 'Bahubal', 'Baniyachong', 'Chunarughat', 'Habiganj Sadar', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Shayestaganj'].sort(),
  'Jamalpur': ['Baksiganj', 'Dewanganj', 'Islampur', 'Jamalpur Sadar', 'Madarganj', 'Melandaha', 'Sarishabari'].sort(),
  'Jashore': ['Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jashore Sadar', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'].sort(),
  'Jhalokati': ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'].sort(),
  'Jhenaidah': ['Harinakunda', 'Jhenaidah Sadar', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'].sort(),
  'Joypurhat': ['Akkelpur', 'Joypurhat Sadar', 'Kalai', 'Khetlal', 'Panchbibi'].sort(),
  'Khagrachhari': ['Dighinala', 'Khagrachhari', 'Lakshmichhari', 'Mahalchhari', 'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'].sort(),
  'Khulna': ['Batiaghata', 'Dacope', 'Dighalia', 'Dumuria', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsa', 'Terokhada'].sort(),
  'Kishoreganj': ['Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kishoreganj Sadar', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'].sort(),
  'Kurigram': ['Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Fulbari', 'Kurigram Sadar', 'Nageswari', 'Rajarhat', 'Raomari', 'Ulipur'].sort(),
  'Kushtia': ['Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Kushtia Sadar', 'Mirpur'].sort(),
  'Lakshmipur': ['Kamalnagar', 'Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati'].sort(),
  'Lalmonirhat': ['Aditmari', 'Hatibandha', 'Kaliganj', 'Lalmonirhat Sadar', 'Patgram'].sort(),
  'Madaripur': ['Kalkini', 'Madaripur Sadar', 'Rajoir', 'Shibchar'].sort(),
  'Magura': ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'].sort(),
  'Manikganj': ['Daulatpur', 'Ghior', 'Harirampur', 'Manikganj Sadar', 'Saturia', 'Shivalaya', 'Singair'].sort(),
  'Meherpur': ['Gangni', 'Meherpur Sadar', 'Mujibnagar'].sort(),
  'Moulvibazar': ['Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Moulvibazar Sadar', 'Rajnagar', 'Sreemangal'].sort(),
  'Munshiganj': ['Gazaria', 'Lohajang', 'Munshiganj Sadar', 'Sirajdikhan', 'Sreenagar', 'Tongibari'].sort(),
  'Mymensingh': ['Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Mymensingh Sadar', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tara Khanda'].sort(),
  'Naogaon': ['Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mahadebpur', 'Naogaon Sadar', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'].sort(),
  'Narail': ['Kalia', 'Lohagara', 'Narail Sadar'].sort(),
  'Narayanganj': ['Araihazar', 'Bandar', 'Narayanganj Sadar', 'Rupganj', 'Sonargaon'].sort(),
  'Narsingdi': ['Belabo', 'Manohardi', 'Narsingdi Sadar', 'Palash', 'Raipura', 'Shibpur'].sort(),
  'Natore': ['Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Natore Sadar', 'Singra'].sort(),
  'Netrokona': ['Atpara', 'Barhatta', 'Durgapur', 'Khaliajuri', 'Kalmakanda', 'Kendua', 'Madan', 'Mohanganj', 'Netrokona Sadar', 'Purbadhala'].sort(),
  'Nilphamari': ['Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Nilphamari Sadar', 'Saidpur'].sort(),
  'Noakhali': ['Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Noakhali Sadar', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Kabirhat'].sort(),
  'Pabna': ['Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Pabna Sadar', 'Santhia', 'Sujanagar'].sort(),
  'Panchagarh': ['Atwari', 'Boda', 'Debiganj', 'Panchagarh Sadar', 'Tetulia'].sort(),
  'Patuakhali': ['Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Patuakhali Sadar', 'Rangabali'].sort(),
  'Pirojpur': ['Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 'Pirojpur Sadar', 'Zianagar'].sort(),
  'Rajbari': ['Baliakandi', 'Goalandaghat', 'Pangsha', 'Rajbari Sadar'].sort(),
  'Rajshahi': ['Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore'].sort(),
  'Rangamati': ['Baghaichhari', 'Barkal', 'Kawkhali', 'Belaichhari', 'Kaptai', 'Juraichhari', 'Langadu', 'Nannerchar', 'Rajasthali', 'Rangamati Sadar'].sort(),
  'Rangpur': ['Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Rangpur Sadar', 'Taraganj'].sort(),
  'Satkhira': ['Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Satkhira Sadar', 'Shyamnagar', 'Tala'].sort(),
  'Shariatpur': ['Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Shariatpur Sadar', 'Zanjira'].sort(),
  'Sherpur': ['Jhenaigati', 'Nakla', 'Nalitabari', 'Sherpur Sadar', 'Sreebardi'].sort(),
  'Sirajganj': ['Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Sirajganj Sadar', 'Tarash', 'Ullahpara'].sort(),
  'Sunamganj': ['Bishwamvarpur', 'Chhatak', 'Derai', 'Dharamapasha', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Sulla', 'Sunamganj Sadar', 'Tahirpur'].sort(),
  'Sylhet': ['Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Sylhet Sadar', 'Zakiganj'].sort(),
  'Tangail': ['Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Tangail Sadar'].sort(),
  'Thakurgaon': ['Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail', 'Thakurgaon Sadar'].sort(),
};

export const OUTSIDE_DHAKA_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra",
  "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga",
  "Comilla", "Cox's Bazar", "Dinajpur", "Faridpur", "Feni", "Gaibandha",
  "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati",
  "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram",
  "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj",
  "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail",
  "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali",
  "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi",
  "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
].sort();

export const CITY_CORPORATIONS = [
  { value: 'dhaka_north', label: 'Dhaka North City Corporation' },
  { value: 'dhaka_south', label: 'Dhaka South City Corporation' }
];

export const DELIVERY_LOCATIONS = [
  { value: 'inside_dhaka', label: 'Inside Dhaka' },
  { value: 'outside_dhaka', label: 'Outside Dhaka' }
];
