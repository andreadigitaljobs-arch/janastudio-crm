import fs from 'fs';
import path from 'path';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern: {formatCurrency(item._totalBs)} Bs.
    // Ref: {item._txType === 'expense' ? '-' : ''}${formatCurrency(item._amountUSD)}
    content = content.replace(/\{item\._txType === 'expense' \? '-' : '\+'\}\{formatCurrency\(item\._totalBs\)\} Bs\./g, 
                              "${item._txType === 'expense' ? '-' : '+'}${formatCurrency(item._amountUSD)}");
    content = content.replace(/Ref: \{item\._txType === 'expense' \? '-' : ''\}\$\{formatCurrency\(item\._amountUSD\)\}/g,
                              "Ref: {item._txType === 'expense' ? '-' : ''}{formatCurrency(item._totalBs)} Bs.");

    // Pattern: {formatCurrency((item.total_price !== undefined ... * Number(item.exchange_rate ...)} Bs.
    // Ref: ${formatCurrency(item.total_price !== undefined ...)}
    // Using simple replacements for specific known blocks:
    content = content.replace(
        /\{formatCurrency\(\(item\.total_price \!== undefined \&\& item\.total_price \!== null \&\& Number\(item\.total_price\) > 0 \? Number\(item\.total_price\) : Number\(item\.services\?\.price \|\| 0\)\) \* Number\(item\.exchange_rate \|\| rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\./g,
        "${formatCurrency(item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0 ? Number(item.total_price) : Number(item.services?.price || 0))}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(item\.total_price \!== undefined \&\& item\.total_price \!== null \&\& Number\(item\.total_price\) > 0 \? Number\(item\.total_price\) : Number\(item\.services\?\.price \|\| 0\)\)\}/g,
        "Ref: {formatCurrency((item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0 ? Number(item.total_price) : Number(item.services?.price || 0)) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs."
    );

    // Pattern: +{formatCurrency(Number(ex.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${ex.price})
    content = content.replace(
        /\+\{formatCurrency\(Number\(ex\.price\) \* Number\(item\.exchange_rate \|\| rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\. \(Ref: \+\$\{ex\.price\}\)/g,
        "+${ex.price} (Ref: +{formatCurrency(Number(ex.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.)"
    );

    // Pattern: +{formatCurrency(Number(pr.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs. (Ref: +${pr.price})
    content = content.replace(
        /\+\{formatCurrency\(Number\(pr\.price\) \* Number\(item\.exchange_rate \|\| rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\. \(Ref: \+\$\{pr\.price\}\)/g,
        "+${pr.price} (Ref: +{formatCurrency(Number(pr.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.)"
    );

    // Pattern: +{formatCurrency(totalTips * rate)} Bs. (Ref: +${formatCurrency(totalTips)})
    content = content.replace(
        /\+\{formatCurrency\(totalTips \* rate\)\} Bs\. \(Ref: \+\$\{formatCurrency\(totalTips\)\}\)/g,
        "+${formatCurrency(totalTips)} (Ref: +{formatCurrency(totalTips * rate)} Bs.)"
    );

    // Pattern: {formatCurrency(item._totalBsOverride || (totalReceipt * rate))} Bs.
    // Ref: ${formatCurrency(totalReceipt)}
    content = content.replace(
        /\{formatCurrency\(item\._totalBsOverride \|\| \(totalReceipt \* rate\)\)\} Bs\./g,
        "${formatCurrency(totalReceipt)}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(totalReceipt\)\}/g,
        "Ref: {formatCurrency(item._totalBsOverride || (totalReceipt * rate))} Bs."
    );

    // Pattern: +{formatCurrency(staffTotal * rate)} Bs.
    // Ref: +${formatCurrency(staffTotal)}
    content = content.replace(
        /\+\{formatCurrency\(staffTotal \* rate\)\} Bs\./g,
        "+${formatCurrency(staffTotal)}"
    );
    content = content.replace(
        /Ref: \+\$\{formatCurrency\(staffTotal\)\}/g,
        "Ref: +{formatCurrency(staffTotal * rate)} Bs."
    );

    // Pattern: +{formatCurrency(janaProfit * rate)} Bs.
    // Ref: +${formatCurrency(janaProfit)}
    content = content.replace(
        /\+\{formatCurrency\(janaProfit \* rate\)\} Bs\./g,
        "+${formatCurrency(janaProfit)}"
    );
    content = content.replace(
        /Ref: \+\$\{formatCurrency\(janaProfit\)\}/g,
        "Ref: +{formatCurrency(janaProfit * rate)} Bs."
    );

    // Pattern: {formatCurrency((item.commission_earned || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
    // Ref: ${formatCurrency(item.commission_earned || 0)}
    content = content.replace(
        /\{formatCurrency\(\(item\.commission_earned \|\| 0\) \* Number\(item\.exchange_rate \|\| rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\./g,
        "${formatCurrency(item.commission_earned || 0)}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(item\.commission_earned \|\| 0\)\}/g,
        "Ref: {formatCurrency((item.commission_earned || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs."
    );

    // Pattern: +{formatCurrency((item.tip_amount || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
    // Ref: +${formatCurrency(item.tip_amount || 0)}
    content = content.replace(
        /\+\{formatCurrency\(\(item\.tip_amount \|\| 0\) \* Number\(item\.exchange_rate \|\| rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\./g,
        "+${formatCurrency(item.tip_amount || 0)}"
    );
    content = content.replace(
        /Ref: \+\$\{formatCurrency\(item\.tip_amount \|\| 0\)\}/g,
        "Ref: +{formatCurrency((item.tip_amount || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs."
    );

    // Pattern: {formatCurrency(totalIncome * (rates?.bcv || rates?.usd || 550))} Bs.
    // Ref: ${formatCurrency(totalIncome)}
    content = content.replace(
        /\{formatCurrency\(totalIncome \* \(rates\?\.bcv \|\| rates\?\.usd \|\| 550\)\)\} Bs\./g,
        "${formatCurrency(totalIncome)}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(totalIncome\)\}/g,
        "Ref: {formatCurrency(totalIncome * (rates?.bcv || rates?.usd || 550))} Bs."
    );

    // Pattern: {formatCurrency(finalBs)} Bs.
    // Ref: ${formatCurrency(val)}
    content = content.replace(
        /\{formatCurrency\(finalBs\)\} Bs\./g,
        "${formatCurrency(val)}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(val\)\}/g,
        "Ref: {formatCurrency(finalBs)} Bs."
    );

    // Pattern: {formatCurrency(Number(amount || 0) * rate)} Bs.
    // Ref: ${formatCurrency(Number(amount || 0))}
    content = content.replace(
        /\{formatCurrency\(Number\(amount \|\| 0\) \* rate\)\} Bs\./g,
        "${formatCurrency(Number(amount || 0))}"
    );
    content = content.replace(
        /Ref: \$\{formatCurrency\(Number\(amount \|\| 0\)\)\}/g,
        "Ref: {formatCurrency(Number(amount || 0) * rate)} Bs."
    );

    // Pattern: {line.isTip ? '+' : ''}{formatCurrency(Number(line.amount || 0) * rate)} Bs.
    // Ref: {line.isTip ? '+' : ''}${formatCurrency(Number(line.amount || 0))}
    content = content.replace(
        /\{line\.isTip \? '\+' : ''\}\{formatCurrency\(Number\(line\.amount \|\| 0\) \* rate\)\} Bs\./g,
        "{line.isTip ? '+' : ''}${formatCurrency(Number(line.amount || 0))}"
    );
    content = content.replace(
        /Ref: \{line\.isTip \? '\+' : ''\}\$\{formatCurrency\(Number\(line\.amount \|\| 0\)\)\}/g,
        "Ref: {line.isTip ? '+' : ''}{formatCurrency(Number(line.amount || 0) * rate)} Bs."
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated", filePath);
    }
}

processFile('C:\\Users\\Waiha\\JanaStudio\\src\\components\\HistoryModule.jsx');
