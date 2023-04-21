"use strict";
import React from "react";
import UIToolkitRenderer from "@amzn/react-uitoolkit";
import {
    ActivityIndicator,
    StyleSheet,
    View} from "react-native";
import ConfigurationFactory from "../../../config";
import ModalSupportedScrollView from "../../subs/ModalSupportedScrollView";
import BaseCoinsComponent from "../utils/BaseCoinsComponent";
import AnalyticsEventsHandler from "../../helpers/AnalyticsEventsHandler";
import * as AnalyticsTypes from "@amzn/hollywood-core-js/src/components/constants/AnalyticsTypes";

const VIEW_STATES = {
    SELECT: "SELECT",
    CONFIRM: "CONFIRM",
    MINTING: "MINTING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
    LOADING: "LOADING",
    FIXUP: "FIXUP"
};

const themableStyles = function (theme) {
    return {
        floatModal: {
            flexDirection: "row"
        },
        outerContainer: theme.get("styles.coinsModal.outerContainer"),
        innerContainer: theme.get("styles.coinsModal.innerContainer"),
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
        },
        actionButton: theme.get("styles.coins.actionButton")
    }
};


class BuyCoinsModal extends BaseCoinsComponent {

    styles = themableStyles

    constructor () {
        super();
        this.initialiseBaseFunctions();
        this.getModalContents = this.getModalContents.bind(this);
    }

    getModalContents(styles, wideScreenOuterModalContainerStyles) {
        switch (this.state.view) {
            case VIEW_STATES.LOADING:
                // Simple loading view, no container
                console.log("entered loading state in buycoins modal");

                return (
                    <ActivityIndicator testID="activity_indicator" size={"large"} color={StyleSheet.flatten(styles.activityIndicator).color}/>
                );

            default: {
                // Actual modal
                const config = ConfigurationFactory.UITOOLKIT_CONFIG_HOLLYWOOD;
                const subRendererStyles = this.state.subRendererVisible ? styles.subRendererVisibleStyle : styles.subRendererHiddenStyle;
                return (
                    <View style={[styles.outerContainer, wideScreenOuterModalContainerStyles]}>
                        {this.renderViewBasedOnState(styles)}
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
    }

    onRequestClose() {
        AnalyticsEventsHandler.createComponentClickEvent(AnalyticsTypes.CLICK_COMPONENT_BUY_COINS_MODAL,
            AnalyticsTypes.CLICK_OUTSIDE_MODAL, this.props.pageType, {state: this.state.view}, {});

        this.props.onRequestClose();
    }

    render() {
        const styles = this.getStyles();
        return (<BaseCoinsComponent renderLayout={this.getModalContents} styles={styles} onRequestClose={this.onRequestClose}/>);
    }
}

BuyCoinsModal.defaultProps = {
    enableThankYouUpsell: true
}

BuyCoinsModal.displayName = "BuyCoinsModal"

export default BuyCoinsModal;
