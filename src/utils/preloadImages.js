const preloadedUrls = new Set();

export const preloadImages = (urls = []) => {
  urls.filter(Boolean).forEach((url) => {
    if (preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const img = new Image();
    img.src = url;
  });
};

export const getStaffAvatarUrl = (staffMember) =>
  staffMember?.image_url ||
  staffMember?.photo_url ||
  `https://i.pravatar.cc/150?u=${encodeURIComponent(staffMember?.name || '')}`;
