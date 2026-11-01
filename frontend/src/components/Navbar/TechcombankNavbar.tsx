// Navbar.tsx
import React, { useState } from 'react';
import IconSolar from "../Icon/IconSolar";
import { FormControl, IconButton, InputLabel, MenuItem, Select } from '@mui/material';
import IconNotify from '../Icon/IconNotify';
import i18n from '../../i18n/i18n';

interface NavBarProps {
  toggleSidebar: () => void;
  navbarFullWidth: boolean;
}

const Navbar: React.FC<NavBarProps> = ({ toggleSidebar, navbarFullWidth }) => {
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const styleIconNavbar = {};

  const handleLanguageToggle = () => {
    const newLanguage = language === 'en' ? 'vi' : 'en';
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage); // Change language dynamically
  };

  const handleYearChange = () => {

  };

  return (
    <>
      <div className={navbarFullWidth ? "navbar" : "navbar fullWidth"}>
        <div className="nav-left">
          <div className="toggle-open">
            <IconButton sx={styleIconNavbar} onClick={toggleSidebar}>
              <IconSolar />
            </IconButton>
            {/* <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Age</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={selectedYear}
                label="Age"
                onChange={handleYearChange}
              >
                <MenuItem value={10}>Ten</MenuItem>
                <MenuItem value={20}>Twenty</MenuItem>
                <MenuItem value={30}>Thirty</MenuItem>
              </Select>
            </FormControl> */}
          </div>
        </div>
        <div className="nav-right">
          <IconButton sx={styleIconNavbar} onClick={handleLanguageToggle}>
            {language === 'vi' ? (
              <img
                src="https://cdn-icons-png.flaticon.com/128/197/197473.png"
                alt="Vietnamese"
                width="22"
                height="22"
              ></img>
            ) : (
              <img
                src="https://cdn-icons-png.flaticon.com/128/330/330425.png"
                alt="English"
                width="22"
                height="22"
              ></img>
            )}
          </IconButton>
          <IconButton sx={styleIconNavbar}>
            <IconNotify />
          </IconButton>
        </div>
      </div>
    </>
  );
};

export default Navbar;
