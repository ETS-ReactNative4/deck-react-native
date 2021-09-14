import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { addStack, moveCard } from '../store/boardSlice';
import { setServer } from '../store/serverSlice';
import { setToken } from '../store/tokenSlice';
import AppMenu from './AppMenu';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-elements';
import Icon from 'react-native-vector-icons/EvilIcons';
import { DraxProvider, DraxView } from 'react-native-drax';
import axios from 'axios';
import createStyles from '../styles/base.js'
import { initialWindowMetrics } from 'react-native-safe-area-context';
import {i18n} from '../i18n/i18n.js';

const styles = createStyles()

// Component that display a board's cards, grouped by stack
class BoardDetails extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            index: 0,   // the index of the stack currently shown
            newStackName: '',
            refreshing: false,
        }
        this.createCard = this.createStack.bind(this)
        this.loadBoard = this.loadBoard.bind(this)
        this.moveCard = this.moveCard.bind(this)
        this.insets = initialWindowMetrics?.insets ?? {
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
        }
    }

    // Function to change the displayed stack
    _handleIndexChange = index => this.setState({ index })

    // Gets the board's details from the server and setup the page's header bar
    componentDidMount() {
        this.loadBoard()
        this.props.navigation.setOptions({
            headerTitle: 'Board details',
            headerRight: () => (<AppMenu/>)
        })    
    }

    render() {
        if (this.props.boards.value[this.props.route.params.boardId].stacks.length === 0) {
            // Board has no stack
            return (
                <View style={[styles.container, {marginBottom: this.insets.bottom}]}>
                    <View>
                        <Text style={styles.textWarning}>
                            {i18n.t('noStack')}
                       </Text>
                    </View>
                    <View style={styles.input} >
                        <TextInput style={{flexGrow: 1}}
                                value={this.state.newStackName}
                                onChangeText={newStackName => {
                                    this.setState({ newStackName })
                                }}
                                placeholder={i18n.t('newStackHint')}
                        />
                        <Button
                            // TODO Why doesn't it work?
                            icon={
                                <Icon
                                    name='arrow-right'
                                    color='#b4b4b4'
                                    size='40'
                                />
                            }
                            type='clear'
                            onPress={() => this.createStack()}
                        />
                    </View>
                </View>
            )
        } else {
            return (
                <DraxProvider>
                    <View style={styles.stackBar} >
                    {this.props.boards.value[this.props.route.params.boardId].stacks.map(stack => (
                        <DraxView
                            key={stack.id}
                            style={styles.stackTab}
                            receivingStyle={styles.stackTabDraggedOver}
                            onReceiveDragDrop={({ dragged: { payload } }) => {
                                console.log(`moving card ${payload}`);
                                this.moveCard(payload, stack.id)
                            }}
                        >
                            <Pressable
                                key={stack.id}
                                onPress={() => {
                                    // Switches to selected stack
                                    this.setState({
                                        index: stack.id
                                    })
                                }}
                            >
                                <Text style={[styles.stackTabText, this.state.index === stack.id ? styles.stackTabTextSelected : styles.stackTabTextNormal]}>
                                    {stack.title}
                                </Text>
                            </Pressable>
                        </DraxView>
                    ))}
                    </View>
                    {typeof this.props.boards.value[this.props.route.params.boardId].stacks[this.state.index] !== 'undefined' && typeof this.props.boards.value[this.props.route.params.boardId].stacks[this.state.index].cards !== 'undefined' &&
                        <ScrollView contentContainerStyle={styles.container}
                            refreshControl={
                                <RefreshControl                
                                    refreshing={this.state.refreshing}
                                    onRefresh={this.loadBoard}
                                />
                            }
                        >
                        {Object.values(this.props.boards.value[this.props.route.params.boardId].stacks[this.state.index].cards).map(card => (
                            <DraxView
                                key={card.id}
                                payload={card.id}
                                style={styles.card}
                                draggingStyle={{opacity: 0}}
                                dragReleasedStyle={{opacity: 0}}
                                hoverStyle={[styles.card, {opacity: 0.6, shadowOpacity: 0}]}
                                onDragEnd={(event) => {
                                    // Shows selected card's details when the user just clicked the card
                                    if (event.dragTranslation.x < 5 &&
                                        event.dragTranslation.x > -5 &&
                                        event.dragTranslation.y < 5 &&
                                        event.dragTranslation.y > -5) {
                                        this.props.navigation.navigate('CardDetails',{
                                            boardId: this.props.route.params.boardId,
                                            stackId: this.state.index,
                                            cardId: card.id
                                        })
                                    }
                                }}
                            >
                                <Text style={[styles.cardTitle, { width: '100%' }]}>
                                    {card.title}
                                </Text>
                            </DraxView>
                        ))}
                        </ScrollView>
                    }
                    <View style={[styles.container, {marginBottom: this.insets.bottom}]}>
                        <Pressable
                            style={styles.button}
                            onPress={() => {this.props.navigation.navigate('NewCard', {
                                boardId: this.props.route.params.boardId,
                                stackId: this.state.index,
                            })}}
                        >
                            <Text style={styles.buttonTitle}>
                                {i18n.t('createCard')}
                            </Text>
                        </Pressable>
                    </View>
                </DraxProvider>
            )
        }
    }

    createStack() {
        console.log('Creating stack', this.state.newStackName)
        axios.post(this.props.server.value + `/index.php/apps/deck/api/v1.0/boards/${this.props.route.params.boardId}/stacks`,
            {
                title: this.state.newStackName,
                order: 10 // TODO depends on other stacks in the board
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.props.token.value
                },
            })
        .then((resp) => {
            if (resp.status !== 200) {
                console.log('Error', resp)
            } else {
                console.log('Stack created')
                this.props.addStack({
                    boardId: this.props.route.params.boardId,
                    stack: resp.data
                })
            }
        })
        .catch((error) => {
            console.log(error)
        })
    }

    loadBoard() {
        this.setState({
            refreshing: true
        })      
        axios.get(this.props.server.value + `/index.php/apps/deck/api/v1.0/boards/${this.props.route.params.boardId}/stacks`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.props.token.value
            }
        })
        .then((resp) => {
            this.setState({
                refreshing: false
            })          
            console.log('cards retrieved from server')
            // TODO check for error
            resp.data.forEach(stack => {
                this.props.addStack({
                    boardId: this.props.route.params.boardId, 
                    stack
                })
            })
            this.setState({
                index: Math.min(...Object.keys(this.props.boards.value[this.props.route.params.boardId].stacks)),
            })
        })
    }
    
    moveCard(cardId, stackId) {
        this.props.moveCard({
            boardId: this.props.route.params.boardId,
            oldStackId: this.state.index,
            newStackId: stackId,
            cardId
        })
        axios.put(this.props.server.value + `/index.php/apps/deck/api/v1.0/boards/${this.props.route.params.boardId}/stacks/${this.state.index}/cards/${cardId}/reorder`,
            {
                order: 0,
                stackId,
            },
            { headers: {
                'Content-Type': 'application/json',
                'Authorization': this.props.token.value
            }
        })
        .then((resp) => {
            // TODO check for error
            console.log('card moved')
        })
        .catch((error) => {
            // Reverts change and inform user
            // TODO inform user
            this.props.moveCard({
                boardId: this.props.route.params.boardId,
                oldStackId: stackId,
                newStackId: this.state.index,
                cardId
            })
        })
    }
}

// Connect to store
const mapStateToProps = state => ({
    boards: state.boards,
    server: state.server,
    token: state.token
})

const mapDispatchToProps = dispatch => (
    bindActionCreators( {
        addStack,
        moveCard,
        setServer,
        setToken
    }, dispatch)
)

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(BoardDetails)