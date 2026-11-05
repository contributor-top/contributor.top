---
title: Phương pháp
description: Cách contributor.top chọn và xếp hạng người dùng GitHub.
---

# Phương pháp

## Ai được xét

1. Với mỗi quốc gia, chúng tôi tìm trên GitHub những người dùng có **vị trí** trong hồ sơ khớp với quốc gia đó hoặc một trong các thành phố của nó. Danh sách chuỗi vị trí của từng quốc gia nằm trong [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) và luôn sẵn sàng nhận pull request.
2. Tìm kiếm của GitHub không sắp xếp được theo đóng góp, nên trong số những người khớp, chúng tôi lấy **1000 người dùng có nhiều người theo dõi nhất** và chỉ xếp hạng họ. Trang của mỗi quốc gia hiển thị số người theo dõi thực tế của người có ít người theo dõi nhất trong số những người được xét.
3. Tổ chức và bot bị loại.
4. Mỗi người thuộc đúng **một** quốc gia: quốc gia đầu tiên được nhắc đến trong vị trí trên hồ sơ. Nếu có nhiều quốc gia, chỉ quốc gia đầu tiên được tính.

## Những gì được tính

Đóng góp trong 12 tháng qua, theo cách GitHub đếm trên hồ sơ:

- **Đóng góp công khai** — commit, pull request, issue và review mà mọi người đều thấy.
- **Tất cả đóng góp** — công khai cộng riêng tư. Đóng góp riêng tư chỉ được tính với những người chọn hiển thị chúng trên hồ sơ; với những người khác, tab này hiển thị cùng con số với tab công khai.
- **Commit** — chỉ commit công khai.

Khi bằng điểm, ai có nhiều người theo dõi hơn sẽ xếp trên, sau đó xét theo tên đăng nhập.

Dưới mỗi tên: `C` là commit công khai, `PR` là pull request, `IS` là issue, `RV` là review và biểu tượng ổ khóa cho đóng góp riêng tư (di chuột lên để xem số chính xác). GitHub báo cáo hoạt động riêng tư dưới dạng một con số duy nhất, không thể tách nhỏ hay kiểm chứng, nên trong bảng xếp hạng **Tất cả đóng góp**, ổ khóa nhỏ cạnh tổng số đánh dấu những người có đóng góp gần như hoàn toàn (90% trở lên) là riêng tư. Họ không bị loại: nhiều người làm việc với mã nguồn đóng. Bảng xếp hạng chính chỉ dùng đóng góp công khai.

Một số tài khoản có số commit cực lớn nhưng hầu như không có hoạt động nào khác: không pull request, không issue, không review. Đó là dấu hiệu của một script commit vào cùng một repository suốt cả ngày, và cũng là dấu hiệu của một tài khoản có gần như mọi commit đều vào một repository của chính nó mà không ai khác dùng. Những người commit thẳng vào một dự án được dùng rộng rãi của người khác, như maintainer của các dự án cộng đồng lớn thường làm, không bị coi là tự động. Những tài khoản như vậy được đánh dấu bằng một robot nhỏ trong bảng xếp hạng quốc gia và bị loại khỏi bảng xếp hạng thế giới cũng như huy hiệu thế giới.

## Vì sao tôi không có trong danh sách?

- Vị trí trong hồ sơ của bạn không khớp với chuỗi nào trong preset của quốc gia bạn. Vị trí là văn bản tự do: hãy thêm thành phố hoặc quốc gia của bạn, hoặc mở pull request vào preset.
- Bạn không nằm trong 1000 người dùng có nhiều người theo dõi nhất ở quốc gia của bạn.
- Đóng góp của bạn là riêng tư và không hiển thị trên hồ sơ.
- Bạn đã yêu cầu được gỡ khỏi bảng xếp hạng (xem [Quyền riêng tư và rút khỏi bảng xếp hạng](/vi/privacy/)).

## Truy cập dữ liệu

Mọi bảng xếp hạng cũng có ở dạng JSON: [`/api/index.json`](/api/index.json) liệt kê các quốc gia, còn `/api/<country>.json` (ví dụ `/api/canada.json`) chứa cả ba bảng xếp hạng với thứ hạng, tên đăng nhập và đóng góp. Bảng xếp hạng thế giới nằm ở [`/api/world.json`](/api/world.json). Các tệp này là tệp tĩnh và có thể được tải từ bất kỳ trang web nào.

Hãy dùng chúng cho nghiên cứu mã nguồn mở, thống kê và dự án cộng đồng. Đừng dùng chúng để liên hệ hàng loạt, tuyển dụng hay bán lại dữ liệu. Những người đã rút khỏi bảng xếp hạng không bao giờ có trong dữ liệu.

## Cập nhật

Các quốc gia được cập nhật lần lượt, quốc gia lâu chưa được cập nhật nhất được ưu tiên trước. Trang của mỗi quốc gia hiển thị thời điểm cập nhật gần nhất.

Lấy cảm hứng từ [committers.top](https://committers.top).
