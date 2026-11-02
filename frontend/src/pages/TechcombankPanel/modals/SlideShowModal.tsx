import { Box, Button, Divider, Grid, Modal, Typography } from '@mui/material';
import React, { useState } from 'react';
import useDialog from '../../../hook/useDialog';
import image1 from '../../../assets/img/surveys/survey_1/slide_1.png';
import image2 from '../../../assets/img/surveys/survey_1/slide_2.png';
import image3 from '../../../assets/img/surveys/survey_1/slide_3.png';
import image4 from '../../../assets/img/surveys/survey_1/slide_4.png';
import image5 from '../../../assets/img/surveys/survey_1/slide_5.png';
import image6 from '../../../assets/img/surveys/survey_1/slide_6.png';
import image7 from '../../../assets/img/surveys/survey_1/slide_7.png';
import image8 from '../../../assets/img/surveys/survey_1/slide_8.png';
import image9 from '../../../assets/img/surveys/survey_1/slide_9.png';
import image10 from '../../../assets/img/surveys/survey_1/slide_10.png';


interface ModalProps {
  openModal: boolean;
  onClose: () => void;
}

const SlideShowModal: React.FC<ModalProps> = ({openModal, onClose})  => {
  const { open, openDialog, closeDialog } = useDialog(); // Initialize useDialog
  
  const slides = [image1, image2, image3, image4, image5, image6, image7, image8, image9, image10];

  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length);
  };

  return (
    <Modal
        open = {openModal}
        onClose={onClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
    >
        <Box className="modal-box">
            <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ textAlign: "center" }}
            >
              Slides
            </Typography>
            <Divider />
            <Grid container columnSpacing={3} className="content-modal" sx={{ rowGap: 3 }}>
                <Grid size={12}>
                <img src={slides[currentSlide]} alt={`Slide ${currentSlide + 1}`} className="tcb-slide-image" />
                </Grid>
            </Grid>
            <Box className="btn-modal-footer" sx={{ textAlign: "end" }}>
                <Button color="inherit" onClick={handlePrevSlide}>
                    Previous
                </Button>
                <Button
                    variant="contained"
                    onClick={handleNextSlide}
                >
                    Next
                </Button>
            </Box>
        </Box>
    </Modal>
  );
};

export default SlideShowModal;
