export const avatarPrompt = `Avatar Placeholder
## https://randomuser.me/
Illustrated avatars
Copy the links below and paste them into the src tag of your web image:

<img src="https://avatar.iran.liara.run/public" />
Random Avatar
get a random profile picture
Random Avatar
https://avatar.iran.liara.run/public

Avatar image based on gender
Get a random Male avatar
(View all male avatars)
Get a random Male avatar
https://avatar.iran.liara.run/public/boy

Get a random Female avatar
(View all female avatars)
Get a random Female avatar
https://avatar.iran.liara.run/public/girl

Avatar image based on username
Just add query param username=[value] to the end of the previous URLs:

Get a unique male avatar
https://avatar.iran.liara.run/public/boy?username=[value]

Get a unique female avatar
https://avatar.iran.liara.run/public/girl?username=[value]

Example:
Unique avatar for ''Scott''
Unique avatar for ''Scott''
https://avatar.iran.liara.run/public/boy?username=Scott

Unique avatar for ''Maria''
Unique avatar for ''Maria''
https://avatar.iran.liara.run/public/girl?username=Maria

Unique avatar image
Get a unique avatar by ID
(View ID of all avatars)
Get a unique avatar by ID
https://avatar.iran.liara.run/public/[ID]

Job avatar image
Add the values [job title] and [gender] to the URLs:

https://avatar.iran.liara.run/public/job/[job title]/[gender]

Example:
Male doctor avatar
(View all job avatar images)
Male doctor avatar
https://avatar.iran.liara.run/public/job/doctor/male

Female Police avatar
(View all job avatar images)
Female Police avatar
https://avatar.iran.liara.run/public/job/police/femalehttps://avatar.iran.liara.run/username?username=[firstname+lastname]

Example:

Options API
Use the options below as query params.
Param
Type
Default
Description
username
String (firstname + lastname)
Random *
The name used to generate initials
background
String (Hex Color Codes)
Random *
Background color Avatar. for example, "eeeeee".
color
String (Hex Color Codes)
Random *
Font color Avatar. for example, "aaaeee".
bold
Boolean
true
Font weight bold or not.
uppercase
Boolean
true
Text in Avatar image uppercase or not.
size
Number (Between 32 and 1024)
256
Avatar image size in pixels.
format
String (png or jpg)
png
Avatar image foramt.
length
Number (1 or 2)
2
Length of the generated initials.
More Example:

https://avatar.iran.liara.run/username?username=James+Taylor&background=f4d9b2&color=FF9800


https://avatar.iran.liara.run/username?username=robert+davis&uppercase=false


https://avatar.iran.liara.run/username?username=elizabeth&bold=false&length=1Use the options below as query params.
Param
Type
Default
Description
username
String (firstname + lastname)
Random *
The name used to generate initials
background
String (Hex Color Codes)
Random *
Background color Avatar. for example, "eeeeee".
color
String (Hex Color Codes)
Random *
Font color Avatar. for example, "aaaeee".
bold
Boolean
true
Font weight bold or not.
uppercase
Boolean
true
Text in Avatar image uppercase or not.
size
Number (Between 32 and 1024)
256
Avatar image size in pixels.
format
String (png or jpg)
png
Avatar image foramt.
length
Number (1 or 2)
2
Length of the generated initials.


## https://randomuser.me/photos
Realistic humam avatar:

## Men
https://randomuser.me/api/portraits/men/<Number from 0 to 100>.jpg

## Women
https://randomuser.me/api/portraits/women/<Number from 0 to 100>.jpg
https://randomuser.me/api/portraits/women/undefined.jpg
`