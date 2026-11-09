---
title: Phương pháp
description: Cách contributor.top chọn và xếp hạng người dùng GitHub.
---

# Phương pháp

## Ai được xét

1. Với mỗi quốc gia, chúng tôi tìm trên GitHub những người dùng có **vị trí** trong hồ sơ khớp với quốc gia đó hoặc một trong các thành phố của nó. Danh sách chuỗi vị trí của từng quốc gia nằm trong [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) và luôn sẵn sàng nhận pull request.
2. Tìm kiếm của GitHub không sắp xếp được theo đóng góp, nên trong số những người khớp, chúng tôi lấy **{{consider}} người dùng có nhiều người theo dõi nhất** và chỉ xếp hạng họ. Trang của mỗi quốc gia hiển thị số người theo dõi thực tế của người có ít người theo dõi nhất trong số những người được xét.
3. Tổ chức và bot bị loại.
4. Mỗi người thuộc đúng **một** quốc gia: quốc gia đầu tiên được nhắc đến trong vị trí trên hồ sơ. Nếu có nhiều quốc gia, chỉ quốc gia đầu tiên được tính.

## Những gì được tính

Đóng góp trong 12 tháng qua, theo cách GitHub đếm trên hồ sơ:

- **Đóng góp công khai** — commit, pull request, issue và review mà mọi người đều thấy.
- **Tất cả đóng góp** — công khai cộng riêng tư. Đóng góp riêng tư chỉ được tính với những người chọn hiển thị chúng trên hồ sơ; với những người khác, tab này hiển thị cùng con số với tab công khai.
- **Commit** — chỉ commit công khai.

Khi bằng điểm, ai có nhiều người theo dõi hơn sẽ xếp trên, sau đó xét theo tên đăng nhập.

Dưới mỗi tên: `C` là commit công khai, `PR` là pull request, `IS` là issue, `RV` là review và biểu tượng ổ khóa cho đóng góp riêng tư (di chuột lên để xem số chính xác).

## Đánh dấu và loại trừ

Một vài quy tắc, áp dụng như nhau cho mọi người, giúp những con số không thể kiểm chứng hoặc do script tạo ra không quyết định bảng xếp hạng. Mỗi dấu trong bảng xếp hạng, khi di chuột lên, cho thấy quy tắc đứng sau nó và những con số mà quy tắc được áp dụng.

| Quy tắc                       | Khi nào                                                                                                                                         | Kết quả                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Gần như toàn bộ riêng tư      | Từ {{private_flag}}% đóng góp trở lên là riêng tư                                                                                               | Ổ khóa cạnh tổng số trong **Tất cả đóng góp**                       |
| Gần như không có gì công khai | Đóng góp công khai dưới {{min_public}}% tổng số                                                                                                 | Không có trong **Tất cả đóng góp**, vẫn có ở các bảng xếp hạng khác |
| Trang trại commit             | Từ {{min_commits}} commit trở lên, gấp ít nhất {{ratio}} lần tổng số pull request, issue và review                                              | Không có trong bảng xếp hạng nào                                    |
| Một kho im ắng                | Từ {{min_commits}} commit trở lên, trong đó từ {{quiet_share}}% trở lên nằm ở một kho của chính họ có ít hơn {{quiet_stars}} sao                | Giống trang trại commit                                             |
| Ngoại lệ                      | Từ {{popular_share}}% commit trở lên vào kho của người khác có từ {{popular_stars}} sao, hoặc vào bất kỳ kho nào của một tổ chức có kho như vậy | Không bao giờ bị đánh dấu là tự động                                |

GitHub báo cáo hoạt động riêng tư dưới dạng một con số duy nhất, không thể tách nhỏ hay kiểm chứng, nên nó chỉ được tính khi có đóng góp công khai làm chỗ dựa; riêng ổ khóa không loại ai, vì nhiều người làm việc với mã nguồn đóng. Những người commit thẳng vào một dự án được dùng rộng rãi, như người duy trì các dự án cộng đồng lớn và bản phân phối Linux thường làm, không bị coi là tự động: chỉ chính dự án mới có thể cho họ quyền commit ở đó.

## Kiểm tra bảng xếp hạng

Bảng xếp hạng chỉ tuân theo các quy tắc này và thứ tự ở trên; không ai bị di chuyển thủ công. Các ngưỡng lấy từ [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), và danh sách thủ công duy nhất trong đó, `denylist_ids`, chỉ thay đổi qua một pull request công khai. Số liệu thu thập cho mỗi quốc gia nằm trong [nhánh `data`](https://github.com/contributor-top/contributor.top/tree/data) của kho mã, nên mọi bảng xếp hạng đều có thể tính lại và kiểm tra.

## Vì sao tôi không có trong danh sách?

- Vị trí trong hồ sơ của bạn không khớp với chuỗi nào trong preset của quốc gia bạn. Vị trí là văn bản tự do: hãy thêm thành phố hoặc quốc gia của bạn, hoặc mở pull request vào preset.
- Bạn không nằm trong {{consider}} người dùng có nhiều người theo dõi nhất ở quốc gia của bạn.
- Gần như toàn bộ đóng góp của bạn là riêng tư (công khai dưới {{min_public}}%): khi đó bạn chỉ không có trong **Tất cả đóng góp**.
- Commit của bạn trông như tự động (xem các quy tắc ở trên): những tài khoản như vậy không có trong bảng xếp hạng nào.
- Đóng góp của bạn là riêng tư và không hiển thị trên hồ sơ.
- Bạn đã yêu cầu được gỡ khỏi bảng xếp hạng (xem [Quyền riêng tư và rút khỏi bảng xếp hạng](/vi/privacy/)).

## Truy cập dữ liệu

Mọi bảng xếp hạng cũng có ở dạng JSON: [`/api/index.json`](/api/index.json) liệt kê các quốc gia, còn `/api/<country>.json` (ví dụ `/api/canada.json`) chứa cả ba bảng xếp hạng với thứ hạng, tên đăng nhập và đóng góp. Bảng xếp hạng thế giới nằm ở [`/api/world.json`](/api/world.json). Các tệp này là tệp tĩnh và có thể được tải từ bất kỳ trang web nào.

Hãy dùng chúng cho nghiên cứu mã nguồn mở, thống kê và dự án cộng đồng. Đừng dùng chúng để liên hệ hàng loạt, tuyển dụng hay bán lại dữ liệu. Những người đã rút khỏi bảng xếp hạng không bao giờ có trong dữ liệu.

## Cập nhật

Các quốc gia được cập nhật lần lượt, quốc gia lâu chưa được cập nhật nhất được ưu tiên trước. Trang của mỗi quốc gia hiển thị thời điểm cập nhật gần nhất.

Lấy cảm hứng từ [committers.top](https://committers.top).
