//#region Validation Help
var valTitle = "Please select title";

var valfname = "Please enter your full first name. Payment and payout transactions will be successfully carried out only if entered first name and last name coincide with the bank account owner first name and last name";
var vallname = "Please enter your full last name. Payment and payout transactions will be successfully carried out only if entered first name and last name coincide with the bank account owner first name and last name";
var valdob = "Please enter or select your date of birth in the format <b>MM-DD-YYYY (month-day-year)</b>. To successfully open an account you have to be at least 18 (Estonian users at least 21) years old!";
var valMail = "Please enter actively used e-mail address. The e-mail address will be used to send important information related to your user account";
var valConfMail = "Please verify your e-mail address. Entered e-mail address and e-mail address confirmation have to be identical";
var valCaptcha = "Please enter displayed security code. If displayed code is illegible, load new code";

var valUname = "Please enter your username. Requirements for valid username:<ul><li>at least 6, at most 20 characters</li><li>can contain lowercase letters (a-z), uppercase letters (A-Z), numbers (0-9), special characters - and _</li><li>cannot contain spaces</li><li>must be available, i.e. not assigned to a previously registered user</li></ul>";
var valphone = "Mobile phone number should be in <b>international format (e.g.: +123456789)</b>. It can serve as an additional way of contacting you in case of important information related to your user account";

var valPswd = "Requirements for valid password: <ul><li>must consist of at least 5, at most 40 characters</li><li>allowed special characters: !#$()@?{}|*+,^.-+&=%_:;~</li><li>cannot contain spaces</li><li>cannot be similar to or contain other personal data (e.g. first name, last name, username, etc.)</li></ul> Tips: <ul><li>longer and more complex passwords are securer</li><li>select password you do not use to log in to other online accounts</li><li>do not share password with others</li></ul>";
var valConfPswd = "Please repeat password entry. Selected password and password confirmation have to be identical";

var valStreet = "Please enter street name";
var valhnr = "House number entry is optional";
var valCity = "Please enter town/city name";
var valpcode = "Please enter ZIP code";
var valCountry = "Please select your country of residence";

var valLng = "Please select preferred language";
var valTerms = "Please confirm you have read and accept Terms and Conditions";

var unameAvailable = "Username <b><i>{0}</i></b> is available";
var unameUnavailable = "Username <b><i>{0}</i></b> is not available";

var mailAvailable = "E-mail address <b><i>{0}</i></b> is available";
var mailUnavailable = "E-mail address <b><i>{0}</i></b> is not available";


var login_incorrectCredentials = "Incorrect username and/or incorrect password. Please try again";
var loginTooltip_title = "Login";
//#endregion

//#region LIVE BETTING VARIABLES
var live_today = "Today";
var live_tomorrow = "Tomorrow";

var liveInfo_noMatches = "Currently there are no events in live sports betting offer";
var liveInfo_noUpcoming = "Currently there are no upcoming live events";
var liveInfo_noFavorites = "You have no events in the group <b>My live favorites</b>. Click on <div class='fav-star'><span class='glyphicon glyphicon-star'></span></div> to add event or <div class='fav-selected'><span class='glyphicon glyphicon-star'></span></div> icon to remove event from this group";

var trHalftime = "1st halftime";
var trHalftimeShort = "HT";
var live_aggregatedScore = "Match {0}, aggregate score: {1}";
var live_seriesResult = "Match {0}, playoff score: {1}";

var liveInfoPopup_UserIdle_MessageContent = "Refreshing events from live sports offer stopped because you have been idle. Click on the 'Reload' button to reload live events";
var liveInfoPopup_RestartButton = "Reload";
var mainPopup_DefaultHeaderTitle = "Info";
//#endregion


//#region jQuery dialog  localization
var btnclose = "Close";
//#endregion

//#region Sports Treeview
var twExpander = "Show all";
var twCollapser = "Show less";
//#endregion

//#region SEARCH HELP
var search_tooltip_help = "Field cannot be empty. At least 4 characters must be entered. Special characters are not allowed...";
var search_tooltip_title = "Search";
//#endregion

//#region Betslip
var betSlip_confirmation = "Submit bet slip?";
var button_placeBet = "Submit";
var button_cancel = "Cancel";
var button_yes = "Yes";
var button_no = "No";
var button_OK = "OK";
var button_continue = "Continue";
var betSlip_submitFailure = "Bet slip is not accepted";
var betSlip_maxEventsPerBetSlip = "Maximum number of events per bet slip is ";
var betSlip_betExcludedInfo = "Selected bet excluded. Include bet to mark it as bank";
var betSlip_AmountNotValid = "Please enter valid amount";
var betSlip_SystemNotSelected = "Please select at least one of offered systems";
var betSlip_cancellation = "Are you sure you want to cancel selected bet slip?";
var betSlip_cancellation_title = "Bet slip cancellation";
//#endregion


//#region user messages
var message_genericError = "We apologize, an unexpected error has occurred while processing your request. Please try again";
var message_genericError_title = "Error";
//#endregion

var twLongDayNamesArray = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var twEmptyBetslipError = "Your bet slip is currently empty";


//#region PAYMENT
var tw_depositConfirmationMsg = "Please confirm your deposit request for {0} EUR by {1} payment method. The payment transaction can not be stopped or canceled.";
var tw_depositConfirmationTitle = "Payment confirmation";
var tw_withdrawalConfirmationMsg = "Please confirm your withdraw request for {0} EUR by {1} payment method. The payment transaction can not be stopped or canceled.";
var tw_withdrawalConfirmationTitle = "Withdrawal confirmation";
var tw_deposit_invalidAmount = "Please enter a valid payment amount";
var tw_withdrawal_invalidAmount = "Please enter a valid amount to withdraw";
var tw_deposit_invalidPaymentType = "Please select at least one of the payment methods for making a deposit to your account";
var tw_withdrawal_invalidPaymentType = "Please select at least one of the payment methods to withdraw from your account";
var tw_deposit_minAmount = "Amount is not valid. The minimum deposit amount for {0} payment method is {1} {2}";
var tw_deposit_maxAmount = "Amount is not valid. The maximum deposit amount for {0} payment method is {1} {2}";
var tw_withdrawal_minAmount = "Amount is not valid. Minimum withdrawal amount for {0} payment method is {1} {2}";
var tw_withdrawal_maxAmount = "Amount is not valid. Maximum withdrawal amount for {0} payment method is {1} {2}";
var invalid_phone_number = "Please enter a valid phone number";
var invalid_payment_email = "Please enter a valid e-mail address";
var invalid_payment_coin = "Please select a valid coin";
var invalid_coin_wallet_address = "Please enter a valid wallet address";
//#endregion

//#region UPLOAD
var tw_upload_maxFileSize = "The document is too big. Max. size: 5 MB";
var tw_upload_minFileSize = "The document is too small. Min. size: 1 kB";
var tw_upload_maxFilesCount = "Max. number of documents exceeded";
var tw_upload_fileType = "Only documents in image format are allowed: jpeg, jpg, png, etc.";
//#endregion

//#region AccountActivation
var tw_accountActivation_MailConfirmation = "Mail address is not entered. Are you sure you want to proceed without activating your email address?";
var tw_accountActivation_PswdConfirmation = "You did not enter a new password. Are you sure you want to continue without changing the password?";
var tw_accountActivation_PswdMailConfirmation = "You did not enter a new password or your email address. Are you sure you do not want to change the password or to activate an email address?";
var tw_accountActivation_MailConfirmation_Title = "Confirmation";
//#endregion

//#region TOOLTIPS
var tw_startDateHint = "Please enter or select start date in the format MM-DD-YYYY (month-day-year)";
var tw_endDateHint = "Please enter or select end date in the format MM-DD-YYYY (month-day-year). End date should be later than the start date";

var tw_betsPeriodHint = "Select time period to view closed bets";
var tw_betsStatusHint = "Select bets status for selected time period";

var tw_transPeriodHint = "Select time period to view transactions";
var tw_TransStatusHint = "Select transactions type for selected time period";
//#endregion

var scrollSwitchButton_enable = "Enable scrolling";
var scrollSwitchButton_disable = "Disable scrolling";

var ptCancellationContent = "Are you sure you want to cancel selected transaction?";
var ptCancellationTitle = "Confirmation";

var cashout_confirm = "Cash out selected betting slip for {0} {1}?";