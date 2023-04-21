"use strict";
import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import * as Actions from "@amzn/react-uitoolkit/navigation/default-navigator-actions";
import UIToolkitRenderer from "@amzn/react-uitoolkit";
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Linking,
    NativeModules,
    StyleSheet,
    View,
    TouchableWithoutFeedback,
    Keyboard
} from "react-native";
import HText from "@amzn/hollywood-core-js/src/components/subs/HText";
import {HollywoodDataComponent} from "../../../core/HollywoodDataComponent";
import * as Utils from "../../utils/Utils";
import {HollywoodContext} from "../../utils/Utils";
import ConfigurationFactory from "../../../config";
import BaseTheme from "@amzn/hollywood-core-js/src/themes/BaseTheme";
import AppstoreUrlBuilder from "../../utils/AppstoreUrlBuilder";
import ActionButton from "@amzn/hollywood-core-js/src/components/subs/ActionButton";
import FloatModal from "@amzn/hollywood-core-js/src/components/subs/FloatModal";
import ModalSupportedScrollView from "../../subs/ModalSupportedScrollView";
import JpPoints from "./subs/JpPoints";
import * as JpPointsConstants from "../../constants/JpPoints";
import CoinsSuccessView from "./subs/CoinsSuccessView";
import CoinsMintingView from "./subs/CoinsMintingView";
import CoinsBundleDetails from "../subs/CoinsBundleDetails";
import CoinsBalanceBanner from "./subs/CoinsBalanceBanner";
import CoinsBubbleShoveler from "../subs/CoinsBubbleShoveler";
import CoinsErrorView from "./subs/CoinsErrorView";
import CoinsFormInput from "../subs/CoinsFormInput";
import CoinsLegalComponent from "../subs/CoinsLegalComponent";
import CoinsPaymentFixupNotificationView from "./subs/CoinsPaymentFixupNotificationView";
import HttpGet from "../../utils/HttpGet";
import MediaCentralProvider from "../../utils/MediaCentralProvider";
import MfaUtils from "../../utils/MfaUtils";

import * as CoinsConstants from "../../constants/Coins";

import Strings from "../../../strings/Strings";
import * as Str from "../../../strings/StringConstants";
import * as MFAConstants from "../../constants/MFAConstants";
import EventHelper from "@amzn/hollywood-core-js/src/components/utils/EventHelper";
import * as Events from "@amzn/hollywood-core-js/src/components/constants/GlobalEvents";
import AnalyticsEventsHandler from "../../helpers/AnalyticsEventsHandler";
import * as AnalyticsTypes from "@amzn/hollywood-core-js/src/components/constants/AnalyticsTypes";
import NativeActivityLauncher from "../../helpers/NativeActivityLauncher";
import Logger from "../../utils/Logger";

const Coins = NativeModules.Coins;
const Navigation = NativeModules.Navigation;

const NON_NUMERAL_GLOBAL_PATTERN = /[^\d]/g;
const listeners = [];

const VIEW_STATES = {
    SELECT: "SELECT",
    CONFIRM: "CONFIRM",
    MINTING: "MINTING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
    LOADING: "LOADING",
    FIXUP: "FIXUP"
};

const FETCH_BUNDLES_TIMEOUT_MILLIS = 5000;
const READ_CUSTOM_DENOMINATION_INPUT_TIMEOUT_MILLS = 250;

const COINS_FETCH_BUNDLES = "Fetch-Bundles-Coins";

const USE_CASE = "PICK_YOUR_PACK";
const BUY_COINS_MODAL_HEIGHT = 435;
const BUY_COINS_MODAL_HEIGHT_WITH_PYP = 560;
const logger = new Logger("BuyCoinsModal");

const themableStyles = function (theme) {
    return {
        floatModal: {
            flexDirection: "row"
        },
        outerContainer: {
            margin: theme.get("commonStyles.spacing2"),
            backgroundColor: theme.get("commonStyles.componentBackgroundColor"),
            flex: 1
        },
        innerContainer: {
            padding: theme.get("commonStyles.spacing2"),
        },
        innerContainerSubSectionOverride: {
            paddingTop: 0,
        },
        extraPaddedContainer: {
            paddingVertical: theme.get("commonStyles.spacing4")
        },
        activityIndicator: {
            color: theme.get("commonStyles.lightAccentColor")
        },
        subRendererVisibleStyle: {
            flex: -1
        },
        subRendererHiddenStyle: {
            height: 0,
            width: 0
        },
        customBundleContainer: {
            marginHorizontal: theme.get("commonStyles.spacing1"),
            marginTop: theme.get("commonStyles.spacing1"),
            paddingHorizontal: theme.get("commonStyles.spacing2"),
            paddingVertical: theme.get("commonStyles.spacing1"),
            backgroundColor: theme.get("commonStyles.componentBackgroundColor")
        }
    };
};

const BuyCoinsModal = createReactClass({
    displayName: "BuyCoinsModal",
    mixins: [HollywoodDataComponent],
    styles: themableStyles,
    defaultTheme: BaseTheme,

    propTypes: {
        onRequestClose: PropTypes.func.isRequired,
        uitContext: PropTypes.object.isRequired,
        bundleList: PropTypes.array,
        extraBundlesMap: PropTypes.object,
        preAsin: PropTypes.string,
        preSelectMinimumValueRequired: PropTypes.number,
        enableThankYouUpsell: PropTypes.bool,
        pageType: PropTypes.string
    },

    getDefaultProps() {
        return {
            enableThankYouUpsell: true,
        }
    },

    getInitialState() {
        return {
            view: VIEW_STATES.LOADING,
            visible: true,
            coinsBalance: HollywoodContext.getCoinsBalance(),
            imageUrls: {},
            bundleList: undefined,
            extraBundlesMap: undefined,
            bundleItem: undefined,
            preAsin: undefined,
            selectedShovelerBundle: -1,
            result: undefined,
            subRendererUrl: undefined,
            subRendererVisible: false,
            orderId: undefined,
            paymentPlanId: undefined,
            customDenominationInputInfoText: undefined,
            customDenominationInputErrorText: undefined,
            jpPointsAppliedValue: null,
            jpPointsBalance: JpPointsConstants.JP_POINTS_BALANCE_NOT_AVAILABLE,
            shouldSquelchNextClick: false,
            isJpPointsInputValid: true,
            customDenomination: undefined
        }
    },

    componentWillMount() {
        this.strings = Strings.STRING_MAP;

        this.PICK_YOUR_PACK_PLACEHOLDER_BUNDLE_ITEM = {
            zeroesBundle: {
                asin: undefined,
                denomination: "0",
                listPrice: {
                    amount: 0,
                    unit: undefined
                },
                unitPrice: {
                    amount: 0,
                    unit: undefined
                }
            },
            asin: undefined,
            shortDenominationString: "0",
            denominationString: this.strings[Str.coins_denominationSelected].replace("${n}", 0),
            listPriceAmount: 0,
            ourPriceAmount: 0,
            valueString: "0",
            listPriceString: "0",
            ourPriceString: "0",
            savingsString: "0",
            discountPercentString: "0",
            discountString: this.strings[Str.hollywood_coins_bubble_save].replace("${amount}", 0),
            ourPriceWithDiscountString: this.strings[Str.coins_ourPriceWithDiscount].replace("${n}", 0),
            buttonText: this.strings[Str.hollywood_coins_buy_button_text].replace("${coinsAmount}", 0),
            chooseRecipientRef: "apps_sf_chr_zg",
            cancelOrderRef: "apps_sf_cancel_zg",
            buyNowRef: "apps_sf_buynow_zg_0",
            discountPercent: 0,
            currencyCode: undefined
        };

        this.createListeners();

        DeviceEventEmitter.emit(Events.ON_REQUEST_COINS_BALANCE_UPDATE);
    },

    async componentDidMount() {
        AnalyticsEventsHandler.createComponentViewEvent(AnalyticsTypes.BUY_COINS_MODAL, this.props.pageType, {}, {});

        const requestParams = {
            useCase: USE_CASE
        };
        await Promise.all([this.fetchBundles(requestParams), this.fetchJpPointsBalance()]);
        this.initializeDialog();
    },

    componentWillUnmount() {
        EventHelper.unmountListeners(listeners);
        this.isMounted = false;
    },

    createListeners() {
        listeners.push(
            DeviceEventEmitter.addListener(
                Events.ON_COINS_BALANCE_UPDATE,
                (e) => {
                    console.log("BuyCoinsModal: Received " + Events.ON_COINS_BALANCE_UPDATE + " : " + JSON.stringify(e));

                    this.updateBalance(parseInt(e.coinsBalance));
                }
            ),
            DeviceEventEmitter.addListener(
                //for more details about mfa sequence refer this wiki:
                // https://w.amazon.com/bin/view/Coins/Projects/MFA/#H3P
                Events.ON_COINS_MFA_RESPONSE,
                (e) => {
                    console.log("BuyCoinsModal: Received " + Events.ON_COINS_MFA_RESPONSE + " : " + JSON.stringify(e));
                    //if mfa failed or cancelled, show error, else continue with the purchase
                    if (MFAConstants.MFAStatus.FAILED === e.mfaStatus || MFAConstants.MFAStatus.CANCELLED === e.mfaStatus) {
                        this.onError(CoinsConstants.ERRORS.MFA_CHALLENGE_ERROR);
                    } else {
                        this.onMfaChallengeSuccessful();
                    }
                }
            )
        );
    },

    updateBalance(balance) {
        this.setState({
            coinsBalance: balance
        });
    },

    // Called every time BuyCoinsModal is loaded. If the fetch fails, uses the bundles passed by the caller
    // In case there are no bundles passed by the caller, shows a generic error dialog
    fetchBundles: async function (requestParams) {
        const parsedResponseJSON =
            await HttpGet.ssrJsonResponse(
                CoinsConstants.URI.SSR_BUNDLE_ITEMS,
                requestParams,
                FETCH_BUNDLES_TIMEOUT_MILLIS
            );

        // Make sure the dialog is still mounted since we made an async call
        if (this.isMounted) {
            if (parsedResponseJSON.error) {
                if (this.props.bundleList && this.props.bundleList.length > 0) {
                    this.setState({
                        bundleList: this.props.bundleList
                    });
                } else {
                    this.onError(CoinsErrorView.ERRORS.BUNDLE_FETCH_ERROR);
                }

                //log a metric in pmet for bundle fetch error
                AnalyticsEventsHandler.logPmetCountMetric(COINS_FETCH_BUNDLES, CoinsErrorView.ERRORS.BUNDLE_FETCH_ERROR);
            } else {
                this.setState({
                    bundleList: parsedResponseJSON.bundleItems,
                    extraBundlesMap: parsedResponseJSON.extraBundles
                });
            }
        }
    },

    async fetchJpPointsBalance() {
        try {
            if (!HollywoodContext.isBuyCoinsNativeWithJpPointsEnabled()) {
                return;
            }
            const start = Date.now();
            const parsedResponseJSON =
                await HttpGet.ssrJsonResponse(JpPointsConstants.JP_POINTS_GET_BALANCE_URL, {allowRetries: 1},
                    JpPointsConstants.JP_POINTS_GET_BALANCE_TIMEOUT_MILLIS);
            const totalTime = Date.now() - start;
            AnalyticsEventsHandler.logPmetTimeMetric(JpPointsConstants.JP_POINTS_GET_BALANCE_ACTION, "time", totalTime);
            if (!parsedResponseJSON || parsedResponseJSON.error) {
                logger.e("Failed to get JP Points Balance");
                AnalyticsEventsHandler.logPmetCountMetric(JpPointsConstants.JP_POINTS_GET_BALANCE_ACTION, "error");
            } else {
                if (parsedResponseJSON.isJpPointsEnabled && parsedResponseJSON.jpPointsBalance) {
                    const jpPointsBalance = parseInt(parsedResponseJSON.jpPointsBalance, 10);
                    if (isNaN(jpPointsBalance)) {
                        return;
                    }
                    this.setState({
                        jpPointsBalance: jpPointsBalance
                    });
                }
            }
        } catch (e) {
            logger.e(e.message);
            AnalyticsEventsHandler.logPmetCountMetric(JpPointsConstants.JP_POINTS_GET_BALANCE_ACTION, "error");
        }
    },

    initializeDialog() {
        const bundleList = this.state.bundleList;
        const extraBundlesMap = this.state.extraBundlesMap;

        if (bundleList === undefined) {
            this.onError(CoinsErrorView.ERRORS.UNDEFINED_BUNDLE_LIST);
            return;
        }

        const coinsBalance = HollywoodContext.getCoinsBalance();

        // Fetch icons asynchronously now that we"ve successfully gotten the bundles
        this.fetchImageUrls(bundleList);

        const customDenominationRange = this.getCustomDenominationInputRange();
        const minValidCustomDenomination = customDenominationRange ? customDenominationRange.minValidCustomDenomination : undefined;
        const maxValidCustomDenomination = customDenominationRange ? customDenominationRange.maxValidCustomDenomination : undefined;

        // Pre-selected asin takes priority, and will show Confirm view
        if (this.props.preAsin) {
            for (let i = 0; i < bundleList.length; i++) {
                if (bundleList[i].asin === this.props.preAsin) {
                    this.setState({
                        bundleList: bundleList,
                        extraBundlesMap: extraBundlesMap,
                        coinsBalance: coinsBalance,
                        selectedShovelerBundle: i,
                        bundleItem: bundleList[i],
                        view: VIEW_STATES.CONFIRM,
                        finalOurPriceAmount: bundleList[i].ourPriceAmount,
                        preAsin: this.props.preAsin,
                        minValidCustomDenomination: minValidCustomDenomination,
                        maxValidCustomDenomination: maxValidCustomDenomination,
                        customDenominationInputInfoText: this.getValidDenominationsMessage(minValidCustomDenomination, maxValidCustomDenomination)
                    });
                    return;
                }
            }
        }

        let selectedShovelerBundle = 0;

        // If the dialog is to choose a selection based on the minimum required value, find the best match and go to
        // the Select view.
        if (this.props.preSelectMinimumValueRequired) {
            // Bundle list is in a sorted order from least to greatest denomination, so just run along the list until
            // we find a bundle that is greater than the min required value, which will choose the max if we never hit
            // the minimum
            for (let i = 0; i < bundleList.length; ++i) {
                selectedShovelerBundle = i;

                if (parseInt(bundleList[i].zeroesBundle.denomination) >= this.props.preSelectMinimumValueRequired) {
                    break;
                }
            }
        }

        const isBundleSelected = typeof(bundleList[selectedShovelerBundle]) === "object";
        this.setState({
            bundleList: bundleList,
            extraBundlesMap: extraBundlesMap,
            coinsBalance: coinsBalance,
            selectedShovelerBundle: selectedShovelerBundle,
            bundleItem: bundleList[selectedShovelerBundle],
            finalOurPriceAmount: isBundleSelected ? bundleList[selectedShovelerBundle].ourPriceAmount : 0,
            view: VIEW_STATES.SELECT,
            disableBuyButton: !isBundleSelected,
            minValidCustomDenomination: minValidCustomDenomination,
            maxValidCustomDenomination: maxValidCustomDenomination,
            customDenominationInputInfoText: this.getValidDenominationsMessage(minValidCustomDenomination, maxValidCustomDenomination)
        });
    },

    fetchImageUrls: async function (bundleList) {
        const imageList = [
            CoinsConstants.MC_IMAGE.ICON_COIN
        ];

        for (let i = 0; i < bundleList.length; i++) {
            imageList.push(this.getBundleIcon(bundleList[i]));
        }

        const imgUrlsJson = await MediaCentralProvider.toMediaCentralUrls(
            imageList,
            CoinsConstants.URI.MC_BASE
        );

        this.setState({
            imageUrls: imgUrlsJson
        });
    },

    getDefaultCoinsImageUrl() {
        return this.state.imageUrls[CoinsConstants.MC_IMAGE.ICON_COIN];
    },

    getCoinsImageUrl() {
        return this.isShovelerBundleSelected() ? this.state.imageUrls[this.getBundleIcon(this.state.bundleItem)]
            : this.getDefaultCoinsImageUrl();
    },

    getBundleIcon(bundle) {
        return CoinsConstants.MC_IMAGE.ICON_DENOMINATION_BASE.replace("${n}", bundle.zeroesBundle.denomination)
    },

    getSubRendererUrl(view) {
        switch (view) {
            case VIEW_STATES.MINTING:
            case VIEW_STATES.SUCCESS:
                if (this.props.enableThankYouUpsell) {
                    return AppstoreUrlBuilder.getSSRUrl(CoinsConstants.URI.SSR_THANK_YOU_UPSELL);
                }
                // falls through
            default:
                return undefined;
        }
    },

    onBundlePress(i) {
        const validDenominationsMessage = this.getValidDenominationsMessage(this.state.minValidCustomDenomination, this.state.maxValidCustomDenomination);

        this.setState({
            selectedShovelerBundle: i,
            bundleItem: this.state.bundleList[i],
            customDenomination: undefined,
            disableBuyButton: false,
            customDenominationInputInfoText: validDenominationsMessage,
            customDenominationInputErrorText: undefined
        });

        const bundleItem = this.state.bundleList[i];

        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_COINS_BUNDLE, this.props.pageType,
            {
                denomination: bundleItem.zeroesBundle.denomination,
                currency: bundleItem.zeroesBundle.ourPrice.unit
            },
            {}
        );
    },

    onBuyButtonPress() {
        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_BUY, this.props.pageType, {}, {});
        this.setState({
            view: VIEW_STATES.CONFIRM,
            finalOurPriceAmount: this.state.bundleItem.ourPriceAmount,
            jpPointsInputText : null,
            jpPointsAppliedValue: null
        });
    },

    onPasswordChallengeSuccessful() {
        this.setState({
            view: VIEW_STATES.MINTING,
            visible: true,
            subRendererUrl: this.getSubRendererUrl(VIEW_STATES.MINTING)
        });

        this.purchaseBundle();
    },

    onMfaChallengeSuccessful() {
        this.setState({
            view: VIEW_STATES.MINTING,
            visible: true,
            subRendererUrl: this.getSubRendererUrl(VIEW_STATES.MINTING)
        });

        this.continuePurchaseBundleAfterMfa();
    },

    onGoToSelectionButtonPress() {
        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_SELECTION, this.props.pageType, {}, {});

        this.setState({
            view: VIEW_STATES.SELECT,
            preAsin: undefined
        });
    },

    onError(result, params) {
        if (CoinsConstants.FIXABLE_PAYMENT_ERRORS.has(result)) {
            if (CoinsConstants.PAYMENT_FIXUP_NOTIFICATION_PFMS.has(HollywoodContext.getMarketplace())) {
                this.setState({
                    view: VIEW_STATES.FIXUP
                });
            } else {
                this.setState({
                    view: VIEW_STATES.LOADING
                });

                this.onFixUpInvoke()
            }
        } else {
            AnalyticsEventsHandler.createComponentViewEvent(AnalyticsTypes.ERROR_MODAL, this.props.pageType, {},
                {
                    source: AnalyticsTypes.BUY_COINS_MODAL,
                    errorType: result
                },
                {}
            );

            // Special error case: when prices have been updated, send out a refresh event so any cards that are mounted
            // updated the bundles with the current availability
            if (result === CoinsConstants.ERRORS.PRICE_CHANGED) {
                DeviceEventEmitter.emit(Events.ON_REQUEST_COINS_PURCHASE_OPTIONS_UPDATE);
            }

            if (result === CoinsConstants.ERRORS.MFA_CHALLENGE_REQUIRED) {
                const orderId = params && params.orderId;
                const paymentPlanId = params && params.paymentPlanId;
                this.setState({
                    view: VIEW_STATES.LOADING,
                    orderId: orderId,
                    paymentPlanId: paymentPlanId
                });
                MfaUtils.beginMfaChallenge(this.getPurchaseItemInfo(), MFAConstants.ItemType.COINS);
            } else {
                this.setState({
                    view: VIEW_STATES.ERROR,
                    result: result,
                    subRendererUrl: this.getSubRendererUrl(VIEW_STATES.ERROR)
                });
            }
        }
    },

    getPurchaseItemInfo() {
        const bundleItem = this.state.bundleItem;

        return {
            orderId: this.state.orderId,
            paymentPlanId: this.state.paymentPlanId,
            asin: bundleItem.zeroesBundle.asin,
            ourPrice: bundleItem.ourPriceAmount.toString(),
            currencyCode: bundleItem.zeroesBundle.ourPrice.unit
        };
    },

    handleMfaChallengeConfirmation(continueMfa) {
        MfaUtils.logMetricsForMfaConfirmationDialog(this.getPurchaseItemInfo(), MFAConstants.ItemType.COINS, continueMfa);
        continueMfa ? this.onConfirmInvokeMfaChallenge() : this.onError(CoinsConstants.ERRORS.MFA_CHALLENGE_ERROR);
    },


    onConfirmInvokeMfaChallenge() {
        this.setState({
            view: VIEW_STATES.LOADING
        });

        MfaUtils.beginMfaChallenge(this.getPurchaseItemInfo(), MFAConstants.ItemType.COINS);
    },

    reset() {
        this.setState(this.getInitialState());
    },

    closeModal() {
        //this.reset(); // commented out bc of https://issues.labcollab.net/browse/APPFORCE-8006
        this.props.onRequestClose();
    },

    closeModalWithAnalytics(analyticsType) {
        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            analyticsType, this.props.pageType, {}, {});

        this.closeModal();
    },

    onRequestClose() {
        switch (this.state.view) {
            case VIEW_STATES.MINTING:
                break;
            case VIEW_STATES.ERROR:
                this.onRequestCloseForErrorView();
                break;
            default:
                this.closeModal();
                break;
        }
    },

    onRequestCloseForErrorView() {
        switch (this.state.result) {
            case CoinsConstants.ERRORS.MFA_CHALLENGE_REQUIRED:
                this.handleMfaChallengeConfirmation(false);
                break;
            default:
                this.closeModal();
                break;
        }
    },

    purchaseBundle() {
        const bundleItem = this.state.bundleItem;
        let jpPoints = 0;
        if (this.state.isJpPointsInputValid && this.state.jpPointsAppliedValue) {
            jpPoints = this.state.jpPointsAppliedValue;
        }

        window.requestAnimationFrame(() => {
            Coins.purchaseCoinsBundle(
                {
                    asin: bundleItem.zeroesBundle.asin,
                    denomination: bundleItem.zeroesBundle.denomination,
                    listPrice: bundleItem.listPriceAmount.toString(),
                    ourPrice: bundleItem.ourPriceAmount.toString(),
                    currencyCode: bundleItem.zeroesBundle.ourPrice.unit,
                    jpPoints: jpPoints,
                    fromPage: this.props.pageType
                },
                (result) => {
                    this.purchaseSuccessCallback(result)
                },
                (result, params) => {
                    this.onError(result, params)
                }
            );
        });
    },

    purchaseSuccessCallback(result) {
        this.setState({
            view: VIEW_STATES.SUCCESS,
            result: result,
            subRendererUrl: this.getSubRendererUrl(VIEW_STATES.SUCCESS),
            subRendererVisible: true
        });
    },

    continuePurchaseBundleAfterMfa() {
        const bundleItem = this.state.bundleItem;

        window.requestAnimationFrame(() => {
            Coins.validatePurchaseCoinsBundle(
                {
                    asin: bundleItem.zeroesBundle.asin,
                    denomination: bundleItem.zeroesBundle.denomination,
                    listPrice: bundleItem.listPriceAmount.toString(),
                    ourPrice: bundleItem.ourPriceAmount.toString(),
                    currencyCode: bundleItem.zeroesBundle.ourPrice.unit,
                    fromPage: this.props.pageType
                },
                this.state.orderId,
                this.state.paymentPlanId,
                (result) => {
                    this.purchaseSuccessCallback(result)
                },
                (result) => {
                    this.onError(result)
                }
            );
        });
    },

    navigateAway(url, isExternal) {
        if (url) {
            if (isExternal) {
                Linking.openURL(url);
            } else {
                this.closeModal();
                this.navigateTo(url);
            }
        }
    },

    onFixUpInvoke() {
        NativeActivityLauncher.launchFixup(false);

        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_PAYMENT_FIX_UP_OK, this.props.pageType, {}, {});

        this.setState({
            view: VIEW_STATES.SELECT
        });
    },

    onConfirmInvokeCoinsPasswordChallenge() {
        const bundleItem = this.state.bundleItem;

        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_CONFIRM, this.props.pageType, {}, {});

        this.setState({
            view: VIEW_STATES.LOADING,
            visible: false
        });

        window.requestAnimationFrame(() => {
            Coins.passwordChallenge(
                bundleItem.denominationString,
                bundleItem.ourPriceAmount.toString(),
                bundleItem.zeroesBundle.ourPrice.unit,
                bundleItem.ourPriceString,
                bundleItem.zeroesBundle.asin,
                (result) => {
                    this.coinsPasswordChallengeSuccessCallback(result);
                },
                () => {
                    this.onError(CoinsConstants.ERRORS.UNKNOWN_ERROR);
                }
            );
        });
    },

    coinsPasswordChallengeSuccessCallback(result) {
        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_ON_PASSWORD_CHALLENGE, this.props.pageType,
            {
                passwordResponse: (result) ? CoinsConstants.ANALYTIC_STATUS.SUCCEED : CoinsConstants.ANALYTIC_STATUS.CANCEL
            },
            {}
        );
        result ? this.onPasswordChallengeSuccessful() : this.closeModal()
    },

    onSubRendererAction(name, event) {
        switch (name) {
            case Actions.ON_GO_BACK_ACTION: {
                this.goBack();
                break;
            }
            case Actions.ON_NAVIGATE_ACTION: {
                this.navigateAway(event.url, false);
                break;
            }
            default:
                break;
        }
    },

    isShovelerBundleSelected() {
        return this.state.selectedShovelerBundle > -1;
    },

    onCustomDenominationInputFocus() {
        // If there is already a custom input denomination present on focus, nothing to do
        if (this.state.customDenomination) {
            return;
        }

        // No bundle selected or valid coins denomination chosen yet. So use the place holder bundle item
        this.setState({
            selectedShovelerBundle: -1,
            bundleItem: this.PICK_YOUR_PACK_PLACEHOLDER_BUNDLE_ITEM,
            disableBuyButton: true,
            customDenominationInputInfoText: this.getValidDenominationsMessage(this.state.minValidCustomDenomination, this.state.maxValidCustomDenomination)
        });
    },

    getBuyCoinsModalMaxHeight() {
        const height = this.isCustomDenominationEnabled() ? BUY_COINS_MODAL_HEIGHT_WITH_PYP : BUY_COINS_MODAL_HEIGHT;
        return {
            maxHeight: Utils.scaleDP(height)
        }
    },

    // Checks if the data required to support custom denomination input is present and valid
    isCustomDenominationEnabled() {
        return (this.state.extraBundlesMap !== undefined &&
                Object.keys(this.state.extraBundlesMap).length > 0 &&
                this.state.extraBundlesMap[USE_CASE] !== undefined &&
                this.isValidEligibleDenominations());
    },

    // Checks if the eligibleDenominations contain invalid numbers
    isValidEligibleDenominations() {
        const pypBundles = this.state.extraBundlesMap[USE_CASE];

        if (pypBundles.eligibleDenominations === undefined || pypBundles.eligibleDenominations.length < 1) {
            return false;
        }

        const eligibleDenominationsArray = pypBundles.eligibleDenominations;

        for (var i = 0; i < eligibleDenominationsArray.length; i++) {
            if (isNaN(eligibleDenominationsArray[i])) {
                return false;
            }
        }
        return true;
    },

    getValidDenominationsMessage(minValidCustomDenomination, maxValidCustomDenomination) {
        return this.strings[Str.coins_validCustomDenominationRange]
            .replace("${n}", HollywoodContext.formatCoinsBalance(minValidCustomDenomination))
            .replace("${m}", HollywoodContext.formatCoinsBalance(maxValidCustomDenomination))
    },

    // Compute the min and max denominations based on extra bundles
    // The client expects the server to send the extra bundles in ascending order
    // Supports computing min and max denominations for one useCase only since the
    // server supports only one useCase per request
    getCustomDenominationInputRange() {
        if (!this.isCustomDenominationEnabled()) {
            return;
        }
        const extraBundles = this.state.extraBundlesMap;
        const validCustomDenominations = extraBundles[USE_CASE].eligibleDenominations;

        return {
            minValidCustomDenomination: validCustomDenominations[0],
            maxValidCustomDenomination: validCustomDenominations[validCustomDenominations.length - 1]
        }
    },

    updateDenomination(customDenomination) {
        this.setState({
            customDenomination: customDenomination
        });
    },

    validateDenomination() {
        const validDenominationsMessage = this.getValidDenominationsMessage(this.state.minValidCustomDenomination, this.state.maxValidCustomDenomination);

        if (this.state.customDenomination === undefined || this.state.customDenomination === "") {
            this.setState({
                customDenominationInputInfoText: validDenominationsMessage,
                customDenominationInputErrorText: undefined,
                bundleItem: this.PICK_YOUR_PACK_PLACEHOLDER_BUNDLE_ITEM,
                disableBuyButton: true
            });
            return;
        }
        const customDenomination = parseInt(this.state.customDenomination);
        const minValidCustomDenomination = parseInt(this.state.minValidCustomDenomination);
        const maxValidCustomDenomination = parseInt(this.state.maxValidCustomDenomination);

        if (customDenomination < minValidCustomDenomination || customDenomination > maxValidCustomDenomination || customDenomination % 100 != 0)
        {
            this.setState({
                bundleItem: this.PICK_YOUR_PACK_PLACEHOLDER_BUNDLE_ITEM,
                disableBuyButton: true,
                customDenominationInputErrorText: validDenominationsMessage
            });
        } else {
            this.setState({
                customDenomination: this.state.customDenomination,
                customDenominationInputErrorText: undefined
            });
            this.getExtraBundle();
        }
    },

    getExtraBundle: async function() {
        const customDenomination = this.state.customDenomination;
        const requestParams = {
            useCase: USE_CASE,
            requestedDenomination: customDenomination
        };
        let denominationToBundleItemMap = this.state.extraBundlesMap[USE_CASE]["denominationToBundleItemMap"];
        if (denominationToBundleItemMap !== undefined && denominationToBundleItemMap[customDenomination] === undefined) {
            this.setState({
                disableBuyButton: true,
                customDenominationInputInfoText: this.strings[Str.coins_retrievingDiscountInfo]
            });
            await this.fetchBundles(requestParams);
            // It is possible user might have changed the input or selected shoveler bundles or exited the modal by the
            // time fetch finishes. If that is the case, don't bother proceeding further
            if (customDenomination !== this.state.customDenomination || this.isShovelerBundleSelected()) {
                return;
            }
            denominationToBundleItemMap = this.state.extraBundlesMap[USE_CASE]["denominationToBundleItemMap"];
            if (denominationToBundleItemMap[customDenomination] === undefined) {
                this.setState({
                    view: VIEW_STATES.SELECT,
                    customDenominationInputErrorText: this.strings[Str.coins_sorryError]
                });
                return;
            }
        }
        this.setState({
            view: VIEW_STATES.SELECT,
            bundleItem: denominationToBundleItemMap[customDenomination],
            customDenomination: customDenomination,
            disableBuyButton: false,
            customDenominationInputInfoText: this.strings[Str.coins_discountString].replace("${n}", denominationToBundleItemMap[customDenomination].discountPercentString)
        });
    },

    getModalContents(styles) {
        switch (this.state.view) {
            case VIEW_STATES.LOADING:
                // Simple loading view, no container

                return (
                    <ActivityIndicator size={"large"} color={StyleSheet.flatten(styles.activityIndicator).color}/>
                );

            default: {
                // Actual modal

                const config = ConfigurationFactory.UITOOLKIT_CONFIG_HOLLYWOOD;

                const subRendererStyles = this.state.subRendererVisible ? styles.subRendererVisibleStyle : styles.subRendererHiddenStyle;

                return (
                    <View style={styles.outerContainer}>
                        {this.getMainViewContents(styles)}
                        {
                            this.state.subRendererUrl &&
                            <View style={subRendererStyles}>
                                <ModalSupportedScrollView>
                                    <UIToolkitRenderer
                                        url={`${this.state.subRendererUrl}`}
                                        config={config}
                                        onAction={this.onSubRendererAction}
                                        loadingView={() => {return null;}}
                                        errorView={() => {return null;}}
                                    />
                                </ModalSupportedScrollView>
                            </View>
                        }
                    </View>
                )
            }
        }
    },

    onJpPointsChange(jpPointsInputText) {
        const currentValue = jpPointsInputText.replace(NON_NUMERAL_GLOBAL_PATTERN, "");
        let jpPointsAppliedValue = null;
        let isValid = false;
        if (!currentValue) {
            isValid = true;
        } else {
            jpPointsAppliedValue = parseInt(currentValue, 10);
            isValid = (jpPointsAppliedValue > 0)
                && (jpPointsAppliedValue <= Math.min(this.state.bundleItem.ourPriceAmount, this.state.jpPointsBalance));
        }
        let finalOurPriceAmount = this.state.bundleItem.ourPriceAmount;
        if (isValid && jpPointsAppliedValue) {
            finalOurPriceAmount = this.state.bundleItem.ourPriceAmount - jpPointsAppliedValue;
        }
        this.setState({
            finalOurPriceAmount: finalOurPriceAmount,
            jpPointsAppliedValue: jpPointsAppliedValue,
            isJpPointsInputValid: isValid,
        });
    },

    getMainViewContents(styles) {
        const bundleData = this.state.bundleItem;

        switch (this.state.view) {
            case VIEW_STATES.SELECT: {

                const contents = [];
                let key = 0;

                contents.push(
                    <CoinsBalanceBanner key={key++} balance={this.state.coinsBalance}/>
                );

                contents.push(
                    <CoinsBundleDetails
                        key={key++}
                        bundle={bundleData}
                        iconUrl={this.getCoinsImageUrl()}
                        containerBaseStyle={[styles.innerContainer, styles.extraPaddedContainer]}
                        useAlternateStyle={true}
                    />
                );

                if (this.isCustomDenominationEnabled()) {
                    contents.push(
                        <View key={key++} style={styles.customBundleContainer}>
                            <HText baseFont={HText.PRESETS.HEADING_4}>
                                {this.strings[Str.coins_selectBundle]}
                            </HText>
                        </View>
                    );
                }

                contents.push(
                    <CoinsBubbleShoveler
                        key={key++}
                        bundleList={this.state.bundleList}
                        selectedBundle={this.state.selectedShovelerBundle}
                        onSelectBundle={(i) => this.onBundlePress(i)}
                    />
                );

                if (this.isCustomDenominationEnabled()) {
                    contents.push(
                        <View key={key++} style={styles.customBundleContainer}>
                            <HText baseFont={HText.PRESETS.HEADING_4}>
                                {this.strings[Str.coins_enterAmountOfCoinsToBuy]}
                            </HText>

                            <View>
                                <CoinsFormInput
                                    onInput={(input) =>
                                    {
                                        this.updateDenomination(input);
                                        if (this.readInput) {
                                            clearTimeout(this.readInput);
                                        }
                                        this.readInput = setTimeout(() => {
                                            this.readInput = null;
                                            this.validateDenomination();
                                        }, READ_CUSTOM_DENOMINATION_INPUT_TIMEOUT_MILLS);
                                    }
                                    }
                                    onFocus={this.onCustomDenominationInputFocus}
                                    value={this.isShovelerBundleSelected() ? undefined : this.state.customDenomination}
                                    informationText={this.state.customDenominationInputInfoText}
                                    errorText={this.state.customDenominationInputErrorText}
                                    characterLimit={this.state.maxValidCustomDenomination.length}
                                    keyboardType={"numeric"}
                                />
                            </View>
                        </View>
                    );
                }

                contents.push(
                    <View key={key++} style={[styles.innerContainer, styles.innerContainerSubSectionOverride]}>
                        <ActionButton onPress={this.onBuyButtonPress} useAltColor={true} disabled={this.state.disableBuyButton}>
                            {
                                this.state.disableBuyButton ? this.strings[Str.coins_enterNumberOfCoinsToBuy] :
                                    this.strings[Str.coins_buyXCoins].replace("${n}", bundleData.shortDenominationString)
                            }
                        </ActionButton>

                        <CoinsLegalComponent onRequestNavigate={(url, isExternal) => {
                            this.navigateAway(url, isExternal)
                        }}/>
                    </View>
                );

                return (
                    <ModalSupportedScrollView style={this.getBuyCoinsModalMaxHeight()} showsVerticalScrollIndicator={false}>
                        {
                            contents
                        }
                    </ModalSupportedScrollView>
                );

            }
            case VIEW_STATES.CONFIRM: {

                const contents = [];
                let key = 0;

                contents.push(
                    <CoinsBalanceBanner key={key++} balance={this.state.coinsBalance}/>
                );

                const pointerEvents = this.state.shouldSquelchNextClick ? "none" : "auto";
                const jpPoints = this.isJpPointsEnabled() ? (
                    <JpPoints
                        onJpPointsFocusChange={this.onJpPointsFocusChange}
                        finalOurPriceAmount={this.state.finalOurPriceAmount}
                        isJpPointsInputValid={this.state.isJpPointsInputValid}
                        jpPointsAppliedValue={this.state.jpPointsAppliedValue}
                        onJpPointsChange={this.onJpPointsChange}
                        jpPointsBalance={this.state.jpPointsBalance}
                    />
                ) : null;
                contents.push(
                    <View key={key++} style={styles.innerContainer}>
                        <CoinsBundleDetails
                            bundle={bundleData}
                            iconUrl={this.getCoinsImageUrl()}
                            containerBaseStyle={[styles.extraPaddedContainer]}
                        />
                        {jpPoints}
                        <View pointerEvents={pointerEvents}>
                            <ActionButton onPress={this.onConfirmInvokeCoinsPasswordChallenge} useAltColor={true} disabled={!this.state.isJpPointsInputValid}>
                                {this.strings[Str.coins_confirm]}
                            </ActionButton>

                            <ActionButton onPress={this.onGoToSelectionButtonPress}>
                                {this.state.preAsin ? this.strings[Str.coins_edit] : this.strings[Str.coins_back]}
                            </ActionButton>
                        </View>
                        <CoinsLegalComponent onRequestNavigate={(url, isExternal) => {
                            this.navigateAway(url, isExternal)
                        }}/>
                    </View>
                );

                return contents;

            }
            case VIEW_STATES.MINTING:
                return (
                    <CoinsMintingView
                        iconUrl={this.getDefaultCoinsImageUrl()}
                        containerBaseStyle={[styles.innerContainer, styles.extraPaddedContainer]}
                    />
                );
            case VIEW_STATES.SUCCESS:
                return (
                    <View style={styles.innerContainer}>
                        <CoinsSuccessView
                            iconUrl={this.getDefaultCoinsImageUrl()}
                            headerTitleText={this.strings[Str.coins_thankYou]}
                            headerBodyTextBase={this.strings[Str.coins_addedCoins]}
                            headerBodyTextInsert={bundleData.shortDenominationString}
                            headerBodyTextInsertKey={"${n}"}
                            mainTextBase={this.strings[Str.coins_updatedBalance]}
                            mainTextInsert={HollywoodContext.formatCoinsBalance(this.state.coinsBalance)}
                            mainTextInsertKey={"${n}"}
                            buttonText={this.strings[Str.coins_done]}
                            onButtonPress={() => this.closeModalWithAnalytics(AnalyticsTypes.CLICK_ON_DONE)}
                        />
                    </View>
                );
            case VIEW_STATES.ERROR:
                return (
                    <View style={styles.innerContainer}>
                        <CoinsErrorView
                            analyticComponent={AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL}
                            closeModal={this.closeModal}
                            navigateAway={this.navigateAway}
                            result={this.state.result}
                            mfaHandler={this.handleMfaChallengeConfirmation}
                        />
                    </View>
                );
            case VIEW_STATES.FIXUP:
                return (
                    <View style={styles.innerContainer}>
                        <CoinsPaymentFixupNotificationView
                            startFixUp={this.onFixUpInvoke}
                            cancelFixUp={() => this.closeModalWithAnalytics(AnalyticsTypes.CLICK_ON_PAYMENT_FIX_UP_CANCEL)}
                        />
                    </View>
                );
            default:
                return undefined;
        }
    },

    onJpPointsFocusChange(isFocused) {
        this.setState({
            shouldSquelchNextClick: isFocused,
        });
    },

    squelchClickOutsideJpPointsInputCallback() {
        if (!this.state.shouldSquelchNextClick) {
            return;
        }
        this.setState({
            shouldSquelchNextClick: false,
        });
        Keyboard.dismiss();
    },

    isJpPointsEnabled() {
        return (HollywoodContext.isBuyCoinsNativeWithJpPointsEnabled()
            && this.state.jpPointsBalance !== JpPointsConstants.JP_POINTS_BALANCE_NOT_AVAILABLE);
    },

    render() {
        const styles = this.getStyles();
        const isSquelchClickDisabled = (
            this.state.view !== VIEW_STATES.CONFIRM
            || !this.isJpPointsEnabled());
        return (
            <FloatModal visible={this.state.visible} onRequestClose={this.onRequestClose} style={styles.floatModal}>
                <TouchableWithoutFeedback onPress={this.squelchClickOutsideJpPointsInputCallback} disabled={isSquelchClickDisabled}>
                    {this.getModalContents(styles)}
                </TouchableWithoutFeedback>
            </FloatModal>
        );
    }
});

export default BuyCoinsModal;