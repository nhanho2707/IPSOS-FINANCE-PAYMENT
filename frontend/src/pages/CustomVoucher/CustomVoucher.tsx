import axios from "axios";
import { useEffect, useState } from "react";
import HighlandBanner from "../../assets/img/highland/highland_banner.png";
import HighlandLogo from "../../assets/img/highland/highland_logo.png";
import { ApiConfig } from "../../config/ApiConfig";
import { Box, Button, Card, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import * as htmlToImage from 'html-to-image';
import { useRef } from 'react';
import dayjs from "dayjs";

export default function CustomVoucher() {
    const [ qrBase64, setQrBase64 ] = useState<string | null>(null);
    const [ uuid, setUuid ] = useState<string | null>(null);
    const [ loading, setLoading ] = useState(false);
    const [ message, setMessage ] = useState("");
    const [ expiredVoucher, setExpiredVoucher ] = useState({
        from: "",
        to: ""
    });

    const { token } = useParams<{token: string}>()
    const voucherRef = useRef<HTMLDivElement>(null);

    const [bannerBase64, setBannerBase64] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);

    useEffect(() => {
        const toBase64 = async (url: string) => {
            const res = await fetch(url, { mode: "cors" });
            const blob = await res.blob();
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        };

        const loadImages = async () => {
            const banner = await toBase64(HighlandBanner);
            const logo = await toBase64(HighlandLogo);
            setBannerBase64(banner);
            setLogoBase64(logo);
        };

        loadImages();
    }, []);
    
    const handleGetCustomVoucher = async () => {
        setLoading(true);
        
        try{
            const res = await axios.post(ApiConfig.customvoucher.assignVoucher, {
                token: token
            });

            if(res.data.status_code == 200){
                setQrBase64(res.data.qr);
                setUuid(res.data.uuid);
                setExpiredVoucher({
                    from: dayjs(res.data.expired_from).format("DD/MM/YYYY"),
                    to: dayjs(res.data.expired_to).format("DD/MM/YYYY")
                });
                setMessage("Voucher được cập nhật thành công!");
            } else {
                setQrBase64(null);
                setUuid(null);
                setMessage(res.data.error)
                console.error(res.data.error)
            }
        }catch(err){
            setQrBase64(null);
            setUuid(null);
            setMessage("Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.")
            console.error(err)
        } finally {
            setLoading(false);
        }
    }

    const waitForImages = async (element: HTMLElement) => {
        const images = element.querySelectorAll("img");
        await Promise.all(
            Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })
        );
    };

    const handleDownloadVoucher = async () => {
        if(!voucherRef.current) return;
        
        try{
            await waitForImages(voucherRef.current);
            const dataUrl = await htmlToImage.toPng(voucherRef.current, { cacheBust: true });
            const link = document.createElement("a");
            link.download = `voucher-${uuid}.png`;
            link.href = dataUrl;
            link.click();
        }catch(err){
            console.error("Lỗi khi tạo ảnh: ", err);
        }
    }

    return (
        <div>
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 2,
                    backgroundColor: "#f5f5f5",
                }}
                >
                <Typography
                    variant="body1"
                    align="center"
                    sx={{ mb: 2, color: "success.main" }}
                >
                    Cảm ơn bạn đã tham gia khảo sát của chúng tôi.
                </Typography>

                <Typography variant="body2" align="center" sx={{ mb: 1 }}>
                    Nhấn <b>LẤY VOUCHER</b> để xem phần quà.
                </Typography>

                <Typography variant="body2" align="center" sx={{ mb: 2 }}>
                    Vui lòng nhấn <b>LƯU VOUCHER</b> để lưu lại phần quà.
                </Typography>
                <Button
                    variant="contained"
                    onClick={handleGetCustomVoucher}
                    disabled={loading}
                    sx={{ mb: 2 }}
                >
                    {loading ? "Đang xử lý..." : "Lấy voucher"}
                </Button>

                {message && (
                    <Typography
                    variant="body1"
                    color="error"
                    align="center"
                    sx={{ mb: 2 }}
                    >
                    {message}
                    </Typography>
                )}
                
                {uuid && qrBase64 && bannerBase64 && logoBase64 && (
                    <Card
                        ref={voucherRef}
                        sx={{
                            maxWidth: 550,
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            p: 2,
                            boxShadow: 3,
                        }}
                    >
                        {/* Banner trên cùng */}
                        <Box sx={{ width: "100%", mb: 2 }}>
                            <img src={bannerBase64} alt="Voucher Banner" style={{ width: "100%", objectFit: "cover" }} />
                        </Box>

                        {/* QR Code */}
                        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
                            <img
                            src={`data:image/png;base64,${qrBase64}`}
                            alt="Voucher QR Code"
                            style={{ width: "200px", height: "200px" }}
                            />
                        </Box>
                        
                        <Box
                        sx={{
                            position: "relative",
                            width: "100%",
                            padding: 2,
                            backgroundColor: "#fff",
                            overflow: "hidden",
                        }}
                        >
                            <Box
                                component="img"
                                src={logoBase64}
                                alt="logo"
                                sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: 300,
                                opacity: 0.1,
                                zIndex: 0,
                                pointerEvents: "none",
                                }}
                            />
                            <Box sx={{ position: "relative", zIndex: 1, width: "100%", textAlign: "justify", fontFamily: 'Roboto, sans-serif', fontSize: 14 }}>
                                <Typography sx={{ fontFamily: 'Roboto, sans-serif', fontSize: 15, fontWeight: 600, color: "#4d372b", paddingBottom: '1rem' }}>
                                    Điều kiện áp dụng
                                </Typography>
                                <ul style={{ paddingLeft: '1.2em' }}>
                                    <li style={{ marginBottom: '0.5em', fontWeight: 600, color: "#4d372b" }}>Tặng khách hàng 01 ly PhinDi bất kỳ hoặc 01 ly Trà bất kỳ cỡ vừa (có thể đổi sang Trà Nóng).</li>
                                    <li style={{ marginBottom: '0.5em', fontWeight: 600, color: "#4d372b" }}>Không áp dụng cho sản phẩm mới hoặc sản phẩm thời vụ.</li>
                                    <li style={{ marginBottom: '0.5em', fontWeight: 600, color: "#4d372b" }}>Khách hàng có thể thêm tiền để đổi sang cỡ Lớn.</li>
                                    <li style={{ marginBottom: '0.5em' }}>Vui lòng đưa mã QR cho nhân viên trước khi thanh toán.</li>
                                    <li style={{ marginBottom: '0.5em' }}>E-voucher không có giá trị quy đổi thành tiền mặt.</li>
                                    <li style={{ marginBottom: '0.5em' }}>Không áp dụng chung với các chương trình ưu đãi khác và đối tác giao hàng.</li>
                                    <li style={{ marginBottom: '0.5em' }}>
                                        Không áp dụng tại các quán thuộc hệ thống Mường Thanh, Lotte Mart (Bình Dương, Vũng Tàu, Đồng Nai, Cần Thơ, Vinh, Tây Hồ, Đà Nẵng), 
                                        Sense City, Aeon Mall, VinWonder, GrandWorld, SunWorld, trường RMIT, PVoil; <span style={{fontWeight: 600, color: "#4d372b"}}>Lào Cai</span>: Star Hotel, CIC, <span style={{fontWeight: 600, color: "#4d372b"}}>Hà Nội</span>: Bảo Tàng Lịch Sử Quốc Gia, Nhà Hát Lớn HN, Savico HN, Linh Đàm CT3, 169 Nguyễn Ngọc Vũ; <span style={{fontWeight: 600, color: "#4d372b"}}>Đà Nẵng</span>: VTV8 Bạch Đằng, 233 Nguyễn Văn Thoại, Nguyễn Kim; <span style={{fontWeight: 600, color: "#4d372b"}}>Nha Trang</span>: Viễn Đông Hotel 2, <span style={{fontWeight: 600, color: "#4d372b"}}>Tp. Hồ Chí Minh</span>: Bưu Điện Sài Gòn, Bưu Điện Chợ Lớn, Tôn Thất Thiệp, Foodcourt Menas Mall, VNGCampus, Trạm dừng Phúc Lộc - Tiền Giang và các quán khu vực sân bay trên toàn quốc.
                                    </li>
                                    <li style={{ marginBottom: '0.5em', fontWeight: 600, color: "#4d372b" }}>Không áp dụng các ngày Lễ, Tết như: 27/04; 30/04; 01/05.</li>
                                    <li style={{ marginBottom: '0.5em' }}>Thời gian áp dụng: <span style={{fontWeight: 600, color: "#4d372b"}}>{expiredVoucher.from} – {expiredVoucher.to}</span></li>
                                </ul>
                            </Box>
                        </Box>
                    </Card>
                )}
                {uuid && qrBase64 && (
                    <Button
                        variant="outlined"
                        onClick={handleDownloadVoucher}
                        sx={{ mt: 2 }}
                    >
                        Lưu voucher
                    </Button>
                )}
            </Box>
        </div>
    );
}