"use strict";
import React from "react";
import createReactClass from "create-react-class";
import {StyleSheet, TextInput, View} from "react-native";
import BaseThemeClass from "@amzn/hollywood-core-js/src/themes/BaseTheme";
import Strings from "../../../../strings/Strings";

import * as Str from "../../../../strings/StringConstants";
import Scaling from "@amzn/hollywood-core-js/src/components/utils/Scaling";
import HText from "@amzn/hollywood-core-js/src/components/subs/HText";
import PropTypes from "prop-types";
import {HollywoodDataComponent} from "../../../../core/HollywoodDataComponent";
import {HollywoodDefaultThemeMixin} from "@amzn/hollywood-core-js/src/mixins/HollywoodThemeMixin";

const themableStyles = function (theme) {
    return {
        flexRow: {
            flexDirection: "row"
        },
        jpPointsInput: {
            flexDirection: "row",
            width: Scaling.scaleDP(320),
            height: Scaling.scaleDP(72),
            backgroundColor: theme.get("colors.lightGrey"),
            borderRadius: Scaling.scaleDP(4),
        },
        jpPointsBalance: {
            width: Scaling.scaleDP(176),
        },
        jpPointsBalanceDisplay: {
            flexDirection: "row",
            marginTop:  Scaling.scaleDP(7),
        },
        jpPointsBalanceBox: {
            width: Scaling.scaleDP(176),
            marginLeft: Scaling.scaleDP(8),
            marginTop: Scaling.scaleDP(16),
        },
        jpPointsInputBox: {
            width: Scaling.scaleDP(110),
            height: Scaling.scaleDP(40),
            marginTop: Scaling.scaleDP(16),
            marginLeft: Scaling.scaleDP(16),
            borderWidth: Scaling.scaleDP(1),
            borderRadius: Scaling.scaleDP(2),
            color: theme.get("colors.heraldDarkGrey"),
            textAlign: "right",
            paddingRight: Scaling.scaleDP(20),
            backgroundColor: theme.get("colors.white"),
        },
        jpPointsInputValid: {
            borderColor: theme.get("colors.midGrey"),
        },
        jpPointsInputInValid: {
            borderColor: theme.get("colors.red"),
        },
        jpPointsUnit: {
            marginTop: Scaling.scaleDP(25),
            marginLeft: Scaling.scaleDP(-16),
        },
        totalPrice: {
            marginTop: Scaling.scaleDP(16),
            marginBottom: Scaling.scaleDP(24),
            flexDirection: "row",
            justifyContent: "flex-end",
        },
        jpPointsBalanceText: {
            marginLeft: Scaling.scaleDP(8)
        },
        totalPriceLeft: {
            marginRight: Scaling.scaleDP(20)
        },
        totalPriceRight: {
            marginRight: Scaling.scaleDP(4)
        },
        textBottomAlign: {
            textAlignVertical : "bottom",
        },
    };
};

const JpPoints = createReactClass({
    displayName: "JpPoints",
    styles: themableStyles,
    mixins: [HollywoodDefaultThemeMixin, HollywoodDataComponent],
    defaultTheme: BaseThemeClass.BaseTheme,

    propTypes: {
        finalOurPriceAmount: PropTypes.number.isRequired,
        isJpPointsInputValid: PropTypes.bool.isRequired,
        jpPointsAppliedValue: PropTypes.number,
        jpPointsBalance: PropTypes.number.isRequired,
        onJpPointsFocusChange: PropTypes.func.isRequired,
        onJpPointsChange: PropTypes.func.isRequired,
    },

    componentWillMount() {
        this.strings = Strings.STRING_MAP;
    },

    onJpPointsFocus(event) {
        this.props.onJpPointsFocusChange(true);
    },
    onJpPointsBlur(event) {
        console.log("called onJpPointsBlur");
        this.props.onJpPointsFocusChange(false);
    },

    render() {
        const styles = this.getStyles();
        const jpPointsInputBoxStyle = StyleSheet.flatten([styles.jpPointsInputBox,
            this.props.isJpPointsInputValid ? styles.jpPointsInputValid : styles.jpPointsInputInValid]);
        const jpPointsUnit = this.props.jpPointsAppliedValue ?
            (<HText testID={Str.hollywood_jp_points_unit} baseFont={HText.PRESETS.HEADING_4} styleOverrides={styles.jpPointsUnit}>
                {this.strings[Str.hollywood_jp_points_unit]}</HText>)
            : null;

        return (
            <View>
                <View style={styles.jpPointsInput}>
                    <View testID="jp_points_balance_box" style={styles.jpPointsBalanceBox}>
                        <HText testID={Str.hollywood_jp_points_use} baseFont={HText.PRESETS.HEADING_4}>
                            {this.strings[Str.hollywood_jp_points_use]}
                        </HText>
                        <View testID="jp_points_balance_display" style={styles.jpPointsBalanceDisplay}>
                            <HText testID={Str.hollywood_jp_points_balance} baseFont={HText.PRESETS.SUB_3} styleOverrides={styles.textBottomAlign}>
                                {this.strings[Str.hollywood_jp_points_balance]}
                            </HText>
                            <HText testID={Str.hollywood_jp_points_unit}
                                baseFont={HText.PRESETS.HEADING_4}
                                styleOverrides={[styles.jpPointsBalanceText, styles.textBottomAlign]}>
                                {this.props.jpPointsBalance}{this.strings[Str.hollywood_jp_points_unit]}
                            </HText>
                        </View>
                    </View>
                    <TextInput
                        testID={Str.hollywood_jp_points_input_placeholder}
                        keyboardType={"numeric"}
                        onFocus={this.onJpPointsFocus}
                        onBlur={this.onJpPointsBlur}
                        placeholder={this.strings[Str.hollywood_jp_points_input_placeholder]}
                        style={jpPointsInputBoxStyle}
                        placeholderTextColor={"grey"}
                        onChangeText={this.props.onJpPointsChange}
                        value={(this.props.jpPointsAppliedValue ? this.props.jpPointsAppliedValue.toString() : "")}
                        underlineColorAndroid={"transparent"}
                        maxLength={12}
                    />
                    {jpPointsUnit}
                </View>
                <View style={styles.totalPrice}>
                    <HText
                        testID={Str.hollywood_jp_points_total_price}
                        baseFont={HText.PRESETS.HEADING_4}
                        styleOverrides={[styles.totalPriceLeft, styles.textBottomAlign]}>
                        {this.strings[Str.hollywood_jp_points_total_price]}</HText>
                    <HText testID={Str.hollywood_jp_currency_unit} baseFont={HText.PRESETS.HEADING_1} styleOverrides={styles.textBottomAlign}>
                        {this.strings[Str.hollywood_jp_currency_unit]}</HText>
                    <HText
                        testID="our_final_price"
                        baseFont={HText.PRESETS.HEADING_1}
                        styleOverrides={[styles.totalPriceRight, styles.textBottomAlign]}>
                        {this.props.finalOurPriceAmount}</HText>
                </View>

            </View>
        );
    }
});

export default JpPoints;
